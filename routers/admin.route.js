import { Router } from "express";
import adminController from "../controller/admin.controller.js";

const adminRouter = Router();

// Core Approval Flow
adminRouter.get("/pending", adminController.getPending);
adminRouter.patch("/approve/:id", adminController.approve);
adminRouter.delete("/reject/:id", adminController.reject);

// Insights & Search
adminRouter.get("/stats/events", adminController.getEventStats);
adminRouter.get("/stats/dashboard", adminController.getDashboard);
adminRouter.get("/search/txn/:txnId", adminController.searchByTxn);

// Default list
adminRouter.get("/", adminController.getPending);
adminRouter.get("/colleges", adminController.getAllcolleges);
adminRouter.get("/registrations-count", adminController.getEventRegistrationsCount);

export default adminRouter;