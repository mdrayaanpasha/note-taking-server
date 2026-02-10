import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import dotenv from "dotenv";
dotenv.config();

class adminController {
    // Accessing the admin password from .env
    password = process.env.ADMIN_PASS;

    approve = async (req, res) => {
        const { id } = req.params;
        
        // 1. HEADER EXTRACTION: Get the password from 'x-admin-pass' header
        // Header keys are automatically lowercased by Express
        const adminHeaderPass = req.headers['x-admin-pass'];

        try {
            // 2. SECURITY: Check if the header exists and matches
            if (!adminHeaderPass || adminHeaderPass !== this.password) {
                return res.status(401).json({
                    message: "UNAUTHORIZED: INVALID_OR_MISSING_ADMIN_CREDENTIALS"
                });
            }

            // 3. DATABASE: Update the status
            const updatedParticipation = await prisma.participation.update({
                where: { participationId: id },
                data: { status: "approved" },
                include: {
                    user: {
                        select: {
                            userEmail: true,
                            userDetails: { select: { name: true } }
                        }
                    },
                    event: { select: { eventName: true } }
                }
            });

            return res.status(200).json({
                message: "PROTOCOL_SUCCESSFULLY_APPROVED",
                operative: updatedParticipation.user.userDetails?.name,
                mission: updatedParticipation.event.eventName
            });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ message: "ERROR: RECORD_NOT_FOUND" });
            }
            return res.status(500).json({ message: "INTERNAL_FAILURE", error: error.message });
        }
    };

    getPending = async (req, res) => {

        const adminHeaderPass = req.headers['x-admin-pass'];

        try {
            console.log("step 1:")
            // Check Admin Auth
            if (!adminHeaderPass || adminHeaderPass !== this.password) {
                return res.status(401).json({ message: "UNAUTHORIZED_ACCESS" });
            }
            console.log("step 2:")

            // Fetch all where status is 'pending'
            const pendingRequests = await prisma.participation.findMany({
                where: {
                    status: "pending"
                },
                include: {
                    user: {
                        select: {
                            userEmail: true,
                            userDetails: true
                        }
                    },
                    event: {
                        select: {
                            eventName: true
                        }
                    },

                },
                orderBy: {
                    createdAt: 'desc' // Newest first
                }
            });

            return res.status(200).json({
                count: pendingRequests.length,
                data: pendingRequests
            });

        } catch (error) {
            return res.status(500).json({ 
                message: "QUERY_FAILURE", 
                error: error.message 
            });
        }
    }
}

export default new adminController();