import { verifyToken } from "../../services/authService.js";
import { findUserById, sanitizeUser } from "../../services/userService.js";

export default function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Missing or invalid authorization header.",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const payload = verifyToken(token);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "User not found.",
      });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized.",
    });
  }
}