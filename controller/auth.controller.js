import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const smtp_user = process.env.SMTP_USER;
const smtp_password = process.env.SMTP_PASS;

// ----------------- Nodemailer -----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: smtp_user, pass: smtp_password },
});

// ----------------- OTP Logic -----------------
const otpStore = {};

export function generateOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  setTimeout(() => delete otpStore[email], 5 * 60 * 1000); // 5 min expiry
  return otp;
}

export async function sendOTP(email, otp) {
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

// ----------------- Controller Handlers -----------------
export const requestOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = generateOTP(email);
  await sendOTP(email, otp);
  res.json({ message: "OTP sent to email" });
};

export const verifyOtp = async (req, res) => {
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
};

export const googleCallback = async (req, res) => {
  try {
    const email = req.user.email;

    let user = await prisma.user.findUnique({ where: { userEmail: email } });
    if (!user) {
      user = await prisma.user.create({ data: { userEmail: email, userPassword: "" } });
    }

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: "1h" });
    res.redirect(`https://nexus-notes-seven.vercel.app/token?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Auth failed" });
  }
};
