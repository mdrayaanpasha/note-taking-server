import { Router } from "express";
import adminController from "../controller/admin.controller.js";

const adminRouter = Router()


adminRouter.get("/approve/:id/",adminController.approve);
adminRouter.get("/",adminController.getPending);

export default adminRouter;