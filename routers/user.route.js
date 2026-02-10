import { Router } from "express";
import dotenv from "dotenv";
import { tokenAuth } from "../service/tokenAuth.js";
import upload from "../service/upload.js"
import userController from "../controller/user.controller.js";

dotenv.config();
const userRouter = Router();



// Define user-related routes here (e.g., registration, login, profile management)

userRouter.post("/details",tokenAuth, userController.insertUserDetails);
userRouter.post("/register-event",tokenAuth, upload.single("file"), userController.registerEvent);
userRouter.get("/",tokenAuth, userController.getUserDetails);





// userRouter.post("/image", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file provided" });
//     }

//     const result = await imagekit.upload({
//       file: req.file.buffer,          // in-memory buffer
//       fileName: req.file.originalname,
//       folder: "/syntaxia-registrations/",
//       useUniqueFileName: true,
//     });

//     return res.status(200).json({
//       message: "Uploaded to ImageKit",
//       url: result.url,
//       thumbnailUrl: result.thumbnailUrl,
//       fileId: result.fileId,
//     });
//   } catch (err) {
//     console.error("ImageKit error:", err);
//     return res.status(500).json({
//       message: "Image upload failed",
//       error: err.message,
//     });
//   }
// });





export default userRouter;