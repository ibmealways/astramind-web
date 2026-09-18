import express from "express";
import { createSessionToken, registerUser, loginUser } from "../../services/authService.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

function setSessionCookie(res, token) {
  res.cookie("aigenikz_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

router.post("/signup", async (req, res) => {
  try {
    const result = await registerUser(req.body || {});
    setSessionCookie(res, result.token);
    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || "Signup failed.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await loginUser(req.body || {});
    setSessionCookie(res, result.token);
    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || "Login failed.",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const refreshedToken = createSessionToken(req.user);
  setSessionCookie(res, refreshedToken);
  return res.json({
    ok: true,
    user: req.user,
    token: refreshedToken,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("aigenikz_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  return res.json({ ok: true });
});

export default router;
