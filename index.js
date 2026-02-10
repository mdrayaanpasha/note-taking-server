import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import cors from "cors";
import noteRouter from "./routers/note.route.js";
import authRouter from "./routers/auth.route.js";


dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GOOGLE_CLIENT_ID = process.env.CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.CALLBACK_URL
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    const user = { id: profile.id, email: profile.emails?.[0].value };
    return done(null, user);
}
));

app.use(passport.initialize());
app.use("/api/auth", authRouter);



app.use("/api/notes",noteRouter);

import userRouter from "./routers/user.route.js";
import adminRouter from "./routers/admin.route.js";
app.use("/api/user", userRouter);

app.use("/api/admin",adminRouter);




app.get("/seed-some-dummy-event", async (req, res) => {



  const eventData = [
    { eventName: "BGMI" },

    { eventName: "Valorant" },
    { eventName: "CTF"},
    { eventName: "IT Quiz"},
    { eventName: "Debugging & Coding "},
    { eventName: "Data Detective"},
    { eventName: "IPL Auction"},
    { eventName: "Anime Quiz"},
    { eventName: "Escape Room"},
    { eventName: "Business Revival"},
    { eventName: "Reel Making"}
  ];


  try {
    //delete all data 
    await prisma.events.deleteMany();
    await prisma.events.createMany({ data: eventData });
    res.json({ message: "Dummy events seeded successfully" });
  } catch (error) {
    console.error("Error seeding events:", error);
    res.status(500).json({ error: "Failed to seed events" });
  }
});

app.get("/all-events-info", async (req, res) => {
  try {
    const events = await prisma.events.findMany({
      
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => console.log("Server running on :4000"));
}

export default app;