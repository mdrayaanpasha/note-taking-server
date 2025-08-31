import express from "express";
import { PrismaClient } from "@prisma/client";
import  authenticateJWT  from "../middleware/auth.js"

const prisma = new PrismaClient();
const noteRouter = express.Router();

// Create note
noteRouter.post("/", authenticateJWT, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title & content required" });

//find email from jwt id.

 const user = await prisma.user.findFirst({
    where:{
        userId:req.user.id
    },
    select:{
        userEmail:true
    }
 })

  const note = await prisma.note.create({
    data: {
      title,
      content,
      userEmail: user.userEmail,
    },
  });

  res.json(note);
});

// Read all notes
noteRouter.get("/", authenticateJWT, async (req, res) => {
    //find email from jwt id.

 const user = await prisma.user.findFirst({
    where:{
        userId:req.user.id
    },
    select:{
        userEmail:true
    }
 })
  const notes = await prisma.note.findMany({
    where: { userEmail: user.userEmail },
    orderBy: { createdAt: "desc" },
  });
  res.json(notes);
});

noteRouter.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);

    if (isNaN(noteId)) {
      return res.status(400).json({ error: "Invalid note ID" });
    }

 const user = await prisma.user.findFirst({
    where:{
        userId:req.user.id
    },
    select:{
        userEmail:true
    }
 })

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.userEmail !== user.userEmail) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// Update note
noteRouter.put("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const note = await prisma.note.updateMany({
      where: { id: parseInt(id), userEmail: req.user.email },
      data: { title, content },
    });
    if (note.count === 0) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note updated" });
  } catch (e) {
    res.status(500).json({ error: "Update failed" });
  }
});

// Delete note
noteRouter.delete("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  //find email from jwt id.

 const user = await prisma.user.findFirst({
    where:{
        userId:req.user.id
    },
    select:{
        userEmail:true
    }
 })

  try {
    const note = await prisma.note.deleteMany({
      where: { id: parseInt(id), userEmail: user.userEmail },
    });
    if (note.count === 0) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default noteRouter;