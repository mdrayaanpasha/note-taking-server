import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class AdminController {
    password = process.env.ADMIN_PASS;

    // Internal Auth Check
    #isAuthenticated(req) {
        return req.headers['x-admin-pass'] === this.password;
    }

    // --- PASS MANAGEMENT ---

    getPending = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        try {
            const pending = await prisma.pass.findMany({
                where: { status: false },
                include: { user: { include: { userDetails: true } } },
                orderBy: { passId: 'desc' }
            });
            return res.status(200).json({ count: pending.length, data: pending });
        } catch (error) {
            return res.status(500).json({ message: "FETCH_ERROR", error: error.message });
        }
    };

    approve = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        const { id } = req.params;
        try {
            const updated = await prisma.pass.update({
                where: { passId: id },
                data: { status: true },
                include: { user: { select: { userDetails: { select: { name: true } } } } }
            });
            return res.status(200).json({ message: "PASS_APPROVED", user: updated.user.userDetails?.name });
        } catch (error) {
            return res.status(500).json({ message: "APPROVE_ERROR" });
        }
    };

    reject = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        const { id } = req.params;
        try {
            await prisma.pass.delete({ where: { passId: id } });
            return res.status(200).json({ message: "PASS_REJECTED_DELETED" });
        } catch (error) {
            return res.status(500).json({ message: "REJECT_ERROR" });
        }
    };

    // --- DATA & ANALYTICS ---

    getEventStats = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        try {
            const events = await prisma.events.findMany({
                include: {
                    participations: {
                        include: {
                            user: { include: { userDetails: true } },
                            pass: true
                        }
                    }
                }
            });
            return res.status(200).json(events);
        } catch (error) {
            return res.status(500).json({ message: "STATS_ERROR" });
        }
    };

    getDashboard = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        try {
            const [users, passes, pending] = await prisma.$transaction([
                prisma.user.count(),
                prisma.pass.count(),
                prisma.pass.count({ where: { status: false } })
            ]);
            return res.status(200).json({ users, totalPasses: passes, pendingPasses: pending });
        } catch (error) {
            return res.status(500).json({ message: "DASHBOARD_ERROR" });
        }
    };

    searchByTxn = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        const { txnId } = req.params;
        try {
            const pass = await prisma.pass.findFirst({
                where: { txnId },
                include: { user: { include: { userDetails: true } } }
            });
            return pass ? res.json(pass) : res.status(404).json({ message: "NOT_FOUND" });
        } catch (error) {
            return res.status(500).json({ message: "SEARCH_ERROR" });
        }
    };

/*
SCHEMA FOR REG:
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 1. Define Enums outside the model
enum PassType {
  BGMI
  VALO
  NON_GAMING

}

model User {
  userId        String        @id @default(cuid())
  userEmail     String        @unique
  userPassword  String
  createdAt     DateTime      @default(now())

  userDetails   UserDetails?
  participations Participation[]
  passes        Pass[] // Added relation link
}

model Pass {
  passId  String   @id @default(cuid())
  userId  String 
  type    PassType // Use the defined Enum
  proof   String
  status Boolean @default(false)
  txnId String


  user    User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  participations Participation[] // Added relation link
}

model Participation {
  participationId String  @id @default(cuid())
  eventId         String
  passId String?

  userId          String

  user            User    @relation(fields: [userId], references: [userId], onDelete: Cascade)
  event           Events  @relation(fields: [eventId], references: [eventId], onDelete: Cascade)
pass Pass? @relation(fields: [passId], references: [passId], onDelete: Cascade)

  @@unique([userId, eventId])
}

model UserDetails {
  userId   String  @id
  name     String
  college  String
  phoneno    String
  course   String
  avatar   Int     @default(1)

  user     User    @relation(fields: [userId], references: [userId], onDelete: Cascade)
}

model Events { 
  eventId       String        @id @default(cuid())
  eventName     String
  createdAt     DateTime      @default(now())

  participations Participation[]

  @@map("events")

}

*/
 getAllcolleges = async (req, res) => {
    if (!this.#isAuthenticated(req)) {
        return res.status(401).json({ message: "UNAUTHORIZED" });
    }

    try {
        const colleges = await prisma.userDetails.findMany({
            select: { college: true }
        });

        const normalizeCollege = (name) => {
            if (!name) return "";

            return name
                .toLowerCase()
                .replace(/,/g, "")
                .replace(/\b(deemed to be|campus|inst|institute|of technology|clg)\b/g, "")
                .replace(/\bypr\b/g, "yeshwanthpur")
                .replace(/\s+/g, " ")
                .trim();
        };

        const map = new Map();

        for (const entry of colleges) {
            const original = entry.college;
            const normalized = normalizeCollege(original);

            // Use first 2 meaningful words as base key
            const baseKey = normalized.split(" ").slice(0, 2).join(" ");

            if (!map.has(baseKey)) {
                map.set(baseKey, original);
            }
        }

        return res.status(200).json([...map.values()]);

    } catch (error) {
        return res.status(500).json({ error, message: "COLLEGES_ERROR" });
    }
};


    getRegistrationsForSpecifiedEventWithUserDetails = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });
        const eventId = req.body.eventId;

        try {
            const events = await prisma.events.findUnique({
                where: { eventId },
                include: {
                    participations: {
                        include: {
                            user: { include: { userDetails: true } },
                            pass: true
                        }
                    }
                }
            });
            return res.status(200).json(events);
        } catch (error) {
            return res.status(500).json({ message: "REGISTRATIONS_ERROR" });
        }
    }


    getEventRegistrationsCount = async (req, res) => {
        if (!this.#isAuthenticated(req)) return res.status(401).json({ message: "UNAUTHORIZED" });  
        try {
            const counts = await prisma.events.findMany({
                include: {
                    participations: {
                        include: {
                            pass: true
                        }
                    }
                }
            });

            const result = counts.map(event => ({
                eventId: event.eventId,
                eventName: event.eventName,
                registrationCount: event.participations.filter(p => p.pass.status).length
            }));

            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: "COUNT_ERROR" });
        }
    }
}

export default new AdminController();