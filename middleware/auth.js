import jwt, { decode } from "jsonwebtoken";

export default function authenticateJWT(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Malformed token" });
  
  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
      console.log(decoded)
    req.user = decoded; // contains { email, ... }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}