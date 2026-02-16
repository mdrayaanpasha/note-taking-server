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
 async checkPassStatus(req, res) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get type from params (e.g., /pass-check/BGMI)
      const { type } = req.params;

      // Normalize to uppercase to match Enum (bgmi -> BGMI)
      const passType = type ? type.toUpperCase() : "";

      // Validate Enum
      const validTypes = ["BGMI", "VALO", "NON_GAMING"];
      if (!validTypes.includes(passType)) {
        return res.status(400).json({ message: "Invalid pass type provided" });
      }

      // Check DB
      const existingPass = await prisma.pass.findFirst({
        where: {
          userId: userId,
          type: passType
        }
      });

      // Return boolean status
      return res.status(200).json({
        exists: !!existingPass, // true if found, false if null
        pass: existingPass || null // Send the pass data if they need it (e.g., to show "Already Registered")
      });

    } catch (error) {
      console.error("Check Pass Error:", error);
      return res.status(500).json({ 
        message: "Internal Server Error", 
        error: error.message 
      });
    }
  }

async registerPass(req, res) {
    try {
      /*
        Expected req.body (Multipart):
        { 
          type: "BGMI" | "VALO" | "NON_GAMING",
          eventIdArray: JSON.stringify(["evt_id_1", "evt_id_2"]),
          name: "Jane Doe",
          college: "IIT",
          phoneno: "9999999999",
          course: "B.Tech",
          avatar: "1",
          txnId: asdsadsad"
        }
      */

      const userId = req.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // 1. Validate User Exists
      const userExists = await prisma.user.findUnique({ where: { userId } });
      if (!userExists) {
        return res.status(404).json({ message: "User record not found. Please re-login." });
      }

      if (!req.file) return res.status(400).json({ message: "No payment proof provided" });

      // 2. Parse & Validate Inputs
      let { eventIdArray, type, name, college, phoneno, course, avatar, txnId } = req.body;

      // Validate Pass Type
      const validTypes = ["BGMI", "VALO", "NON_GAMING"];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid or missing Pass Type" });
      }

      // Validate User Details
      if (!name || !college || !phoneno || !course) {
        return res.status(400).json({ message: "Missing required details: name, college, phoneno, course" });
      }

      // Parse Event Array
      if (typeof eventIdArray === 'string') {
        try {
          eventIdArray = JSON.parse(eventIdArray);
        } catch (e) {
          return res.status(400).json({ message: "Invalid eventIdArray format" });
        }
      }

      if (!Array.isArray(eventIdArray) || eventIdArray.length === 0) {
        return res.status(400).json({ message: "At least one event ID is required" });
      }

      // 3. Upload to ImageKit
      // We use the 'type' in the filename to easily organize storage
      const uploadResult = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${type.toLowerCase()}-pass-${userId}-${Date.now()}`,
        folder: "/syntaxia-registrations",
        useUniqueFileName: true,
      });

      if (!uploadResult?.url) throw new Error("Image upload failed");

      // 4. Database Transaction
      const result = await prisma.$transaction(async (tx) => {
        
        // A. Handle User Details (Create if missing, DO NOT overwrite)
        const existingDetails = await tx.userDetails.findUnique({
          where: { userId: userId }
        });

        let userDetails = existingDetails;

        if (!existingDetails) {
          userDetails = await tx.userDetails.create({
            data: {
              userId,
              name,
              college,
              phoneno,
              course,
              avatar: avatar ? parseInt(avatar) : 1,
            },
          });
        }

        // B. Create the Pass
        const newPass = await tx.pass.create({
          data: {
            userId: userId,
            type: type, // Uses the Enum value passed from frontend
            proof: uploadResult.url,
            txnId: txnId
          },
        });

        // C. Create Participations
        const participationData = eventIdArray.map((eventId) => ({
          userId: userId,
          eventId: eventId,
          passId: newPass.passId,
        }));

        const participations = await tx.participation.createMany({
          data: participationData,
          skipDuplicates: true,
        });

        return { 
          pass: newPass, 
          userDetails: userDetails, 
          count: participations.count 
        };
      });

      return res.status(201).json({
        message: `${type} registration successful`,
        data: result,
      });

    } catch (error) {
      console.error("Pass Registration Error:", error);
      
      if (error.code === 'P2002') {
        return res.status(409).json({ message: "Already registered for one or more selected events." });
      }

      return res.status(500).json({ 
        message: "Internal Server Error", 
        error: error.message 
      });
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
        include: { 
          userDetails: true, 
          // 1. Fetch all passes (BGMI, VALO, NON_GAMING)
          passes: true, 
          // 2. Fetch participations AND the actual Event details
          participations: {
            include: {
              event: true // This gets eventName, etc.
            }
          } 
        },
      });

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      
      // Exclude password
      const { userPassword, ...userData } = user;
      
      // 3. Optional: Create a cleaner "registeredEvents" array for the frontend
      // This makes it easier to map over events in your React component
      const formattedEvents = user.participations.map((p) => ({
        participationId: p.participationId,
        eventId: p.eventId,
        eventName: p.event.eventName, // Name from the relation
        passId: p.passId
      }));

      return res.status(200).json({ 
        user: {
          ...userData,
          registeredEvents: formattedEvents 
        } 
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new UserController();
