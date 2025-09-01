import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ----------------- Controller Functions -----------------
export const createNote = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title & content required" });

  try {
    const user = await prisma.user.findFirst({
      where: { userId: req.user.id },
      select: { userEmail: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const note = await prisma.note.create({
      data: { title, content, userEmail: user.userEmail },
    });

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
};

export const getAllNotes = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { userId: req.user.id },
      select: { userEmail: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const notes = await prisma.note.findMany({
      where: { userEmail: user.userEmail },
      orderBy: { createdAt: "desc" },
    });

    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    if (isNaN(noteId)) return res.status(400).json({ error: "Invalid note ID" });

    const user = await prisma.user.findFirst({
      where: { userId: req.user.id },
      select: { userEmail: true }
    });

    const note = await prisma.note.findUnique({ where: { id: noteId } });

    if (!note || note.userEmail !== user.userEmail) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
};

export const updateNote = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: { userId: req.user.id },
      select: { userEmail: true }
    });

    const note = await prisma.note.updateMany({
      where: { id: parseInt(id), userEmail: user.userEmail },
      data: { title, content },
    });

    if (note.count === 0) return res.status(404).json({ error: "Note not found" });

    res.json({ message: "Note updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};

export const deleteNote = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: { userId: req.user.id },
      select: { userEmail: true }
    });

    const note = await prisma.note.deleteMany({
      where: { id: parseInt(id), userEmail: user.userEmail },
    });

    if (note.count === 0) return res.status(404).json({ error: "Note not found" });

    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
};
