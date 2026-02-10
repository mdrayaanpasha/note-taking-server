import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

export const tokenAuth = (req,res,next)=>{
    console.log("JWT_SECRET in tokenAuth.js:", JWT_SECRET);
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];

        jwt.verify(token, JWT_SECRET, (err, userDetails) => {

            if (err) { 
                return res.status(403).json({ message: "Invalid token" });
            }
            req.userId = userDetails.userId;
            next();
        });
    } else {
        res.status(401).json({ message: "Authorization header missing" });
    }
};