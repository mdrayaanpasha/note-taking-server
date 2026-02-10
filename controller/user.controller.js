import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import imagekit from "../config/imagekit.js";

const prisma = new PrismaClient();

class UserController {

  async insertUserDetails(req, res) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, college, regno, course, pass,avatar } = req.body;

      if (!name || !college || !regno || !course) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (pass) {
        const hashed = await bcrypt.hash(pass, 10);
        await prisma.user.update({
          where: { userId },
          data: { userPassword: hashed },
        });
      }

      const details = await prisma.userDetails.upsert({
        where: { userId },
        update: { name, college, regno, course, avatar:Number(avatar) },
        create: { userId, name, college, regno, course, avatar:Number(avatar) },
      });

      return res.status(200).json({
        message: "User details updated successfully",
        userDetails: details,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async registerEvent(req, res) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let { eventId, otherParticipants } = req.body;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (otherParticipants && !Array.isArray(otherParticipants)) {
        // 1. Check if the single string is a valid email
        if (!emailRegex.test(otherParticipants)) {
            return res.status(400).json({
                message: "INVALID_PARTICIPANT_EMAIL_FORMAT",
            });
        }

        // 2. If valid, normalize it into an array
        otherParticipants = [otherParticipants];
    } 
    // If it's already an array, validate each entry
    else if (Array.isArray(otherParticipants)) {
        const allValid = otherParticipants.every(email => emailRegex.test(email));
        if (!allValid) {
            return res.status(400).json({
                message: "ONE_OR_MORE_INVALID_EMAILS_IN_SQUAD",
            });
        }
    }

      const event = await prisma.events.findUnique({ where: { eventId } });
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const existing = await prisma.participation.findFirst({
        where: { userId, eventId },
      });

      if (existing) {
        return res.status(400).json({
          message: "User already registered for this event",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }


      const uploadResult = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: "/syntaxia-registrations",
        useUniqueFileName: true,
      });

      const registration = await prisma.participation.create({
        data: {
          userId,
          eventId,
          otherParticipants: otherParticipants ?? [],
          thumbnailUrl  : uploadResult.thumbnailUrl,
          imageUrl : uploadResult.url,
          fileId : uploadResult.fileId
        },  
      });

      return res.status(200).json({
        message: "User registered successfully",
        registration,
        proof: {
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          fileId: uploadResult.fileId,
        },
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error registering user",
        error: error.message,
      });
    }
  }

  async getUserDetails(req, res) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await prisma.user.findUnique({
        where: { userId },
        include: { userDetails: true, participations: true },
      });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        //exclude password from response
        const { userPassword, ...userData } = user;
        
        return res.status(200).json({ user: userData });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new UserController();
