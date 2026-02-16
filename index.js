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

app.get("/seed-events", async (req, res) => {
  try {
    const events = [
      { eventId: "cmlgm1wy10001wpij8etyb11w", eventName: "BGMI", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10002wpij5m9w4zjl", eventName: "Valorant", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10003wpijxnoslqtr", eventName: "CTF", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10004wpij622cseeu", eventName: "IT Quiz", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10005wpijzyma7iiu", eventName: "Debugging & Coding", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10006wpijo6lm39g3", eventName: "Data Detective", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10007wpijl52gfwxj", eventName: "IPL Auction", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10008wpij9wkl7ggo", eventName: "Anime Quiz", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy10009wpij3ufrl65m", eventName: "Escape Room", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy1000awpijjbkedi4h", eventName: "Business Revival", createdAt: new Date("2026-02-10T13:02:18.889Z") },
      { eventId: "cmlgm1wy1000bwpij0508s1t8", eventName: "Reel Making", createdAt: new Date("2026-02-10T13:02:18.889Z") }
    ];

    const result = await prisma.events.createMany({
      data: events,
      skipDuplicates: true // prevents crashing if already inserted
    });

    res.json({
      success: true,
      inserted: result.count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to seed events" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => console.log("Server running on :4000"));
}

export default app;