import { verifyToken } from "../../services/authService.js";
import { findUserById, sanitizeUser } from "../../services/userService.js";

export default function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const cookieToken = String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("aigenikz_session="))
      ?.slice("aigenikz_session=".length);
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";
    const candidates = [...new Set([bearerToken, decodeURIComponent(cookieToken || "")].filter(Boolean))];

    if (!candidates.length) {
      return res.status(401).json({
        ok: false,
        error: "Missing or invalid authorization header.",
      });
    }
    let token = "";
    let payload = null;
    for (const candidate of candidates) {
      try {
        payload = verifyToken(candidate);
        token = candidate;
        break;
      } catch {
        // Try the persistent cookie when a cached bearer token is stale.
      }
    }
    if (!payload) throw new Error("No valid session token.");
    const user = findUserById(payload.sub);

    if (!user && process.env.ALLOW_TOKEN_USER_FALLBACK !== "true") {
      return res.status(401).json({
        ok: false,
        error: "User not found.",
      });
    }

    req.user = user
      ? sanitizeUser(user)
      : {
          id: payload.sub,
          name: payload.name || String(payload.email || "Aigenikz Member").split("@")[0],
          email: payload.email,
          plan: payload.plan || "starter",
          status: payload.status || "active",
          createdAt: payload.createdAt || null,
          updatedAt: payload.updatedAt || null,
        };
    req.authToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized.",
    });
  }
}
