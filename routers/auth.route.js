import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { requestOtp, verifyOtp, googleCallback } from "../controller/auth.controller.js";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

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

const authRouter = express.Router();

// ----------------- Google OAuth Routes -----------------
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback
);

// ----------------- OTP Routes -----------------
authRouter.post("/request-otp", requestOtp);
authRouter.post("/verify-otp", verifyOtp);

export default authRouter;
