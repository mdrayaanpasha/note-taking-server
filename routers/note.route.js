import express from "express";
import authenticateJWT from "../middleware/auth.js";
import {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote
} from "../controller/note.controller.js";

const noteRouter = express.Router();

// ----------------- Note Routes -----------------
noteRouter.post("/", authenticateJWT, createNote);
noteRouter.get("/", authenticateJWT, getAllNotes);
noteRouter.get("/:id", authenticateJWT, getNoteById);
noteRouter.put("/:id", authenticateJWT, updateNote);
noteRouter.delete("/:id", authenticateJWT, deleteNote);

export default noteRouter;
