import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import cors from "cors";
import noteRouter from "./routers/note.route.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    const user = { id: profile.id, email: profile.emails?.[0].value };
    return done(null, user);
  }
));

// otp thingy
const otpStore = {};

function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  setTimeout(() => delete otpStore[email], 5 * 60 * 1000); // expire in 5 min
  return otp;
}

import nodemailer from "nodemailer";
const smtp_password = process.env.SMTP_PASS
const smtp_user = process.env.SMTP_USER

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtp_user,
    pass: smtp_password,
  },
});



async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"Notes App" <${smtp_user}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
    html: `<h1>${otp}</h1><p>Expires in 5 minutes</p>`,
  });
}



export function verifyOTP(email, otp) {
  return otpStore[email] === otp;
}


app.use(passport.initialize());

app.get("/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/",async (req,res)=>{
    res.send("hello")
})

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const email = req.user.email;

      // look up user
      let user = await prisma.user.findUnique({
        where: { userEmail: email },
      });

      // create if not found
      if (!user) {
        user = await prisma.user.create({
          data: {
            userEmail: email,
            userPassword: "", // empty since Google login
          },
        });
      }

      const token = jwt.sign({ userId: user.userId }, JWT_SECRET);

      res.redirect(`https://nexus-notes-seven.vercel.app/token?token=${token}`);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Auth failed" });
    }
  }
);


// Step 1: Request OTP
app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = generateOTP(email);
  await sendOTP(email, otp);
  res.json({ message: "OTP sent to email" });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "Email & OTP required" });

  if (!verifyOTP(email, otp))
    return res.status(401).json({ error: "Invalid OTP" });

  try {
    let user = await prisma.user.findUnique({
      where: { userEmail: email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          userEmail: email,
          userPassword: "", // blank because OTP method
        },
      });
    }

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.use("/api/notes",noteRouter);


if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => console.log("Server running on :4000"));
}

export default app;