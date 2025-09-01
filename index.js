import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import cors from "cors";
import noteRouter from "./routers/note.route.js";
import authRouter from "./routers/auth.route.js";


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

app.use(passport.initialize());
app.use("/api/auth", authRouter);



app.use("/api/notes",noteRouter);


if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => console.log("Server running on :4000"));
}

export default app;