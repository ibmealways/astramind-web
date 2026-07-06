import express from "express";
import { registerUser, loginUser } from "../../services/authService.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const result = await registerUser(req.body || {});
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
  return res.json({
    ok: true,
    user: req.user,
  });
});

export default router;