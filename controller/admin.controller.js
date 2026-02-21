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
}

export default new AdminController();