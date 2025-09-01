// routes/auth.route.js
import express from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

dotenv.config();

const prisma = new PrismaClient();
const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const smtp_user = process.env.SMTP_USER;
const smtp_password = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: smtp_user, pass: smtp_password },
});

// ----------------- OTP Logic -----------------
const otpStore = {};

function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  setTimeout(() => delete otpStore[email], 5 * 60 * 1000); // expires in 5 min
  return otp;
}

async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"Notes App" <${smtp_user}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
    html: `<h1>${otp}</h1><p>Expires in 5 minutes</p>`,
  });
}

function verifyOTP(email, otp) {
  return otpStore[email] === otp;
}

// ----------------- Google OAuth Routes -----------------
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const email = req.user.email;

      let user = await prisma.user.findUnique({
        where: { userEmail: email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { userEmail: email, userPassword: "" },
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

// ----------------- OTP Routes -----------------
authRouter.post("/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = generateOTP(email);
  await sendOTP(email, otp);
  res.json({ message: "OTP sent to email" });
});

authRouter.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email & OTP required" });

  if (!verifyOTP(email, otp)) return res.status(401).json({ error: "Invalid OTP" });

  try {
    let user = await prisma.user.findUnique({ where: { userEmail: email } });
    if (!user) {
      user = await prisma.user.create({ data: { userEmail: email, userPassword: "" } });
    }

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default authRouter;
