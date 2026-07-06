import express from "express";
import {
  storeSemanticMemory,
  searchSemanticMemory,
} from "../memory/semanticMemory.js";

const router = express.Router();

/**
 * STORE MEMORY
 */
router.post("/store", async (req, res) => {
  try {
    const { content } = req.body;

    await storeSemanticMemory(content);

    res.json({ success: true });
  } catch (err) {
    console.error("MEMORY STORE ERROR:", err);
    res.status(500).json({ error: "Failed to store memory" });
  }
});

/**
 * SEARCH MEMORY
 */
router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    const results = await searchSemanticMemory(query);

    res.json(results);
  } catch (err) {
    console.error("MEMORY SEARCH ERROR:", err);
    res.status(500).json({ error: "Failed to search memory" });
  }
});

export default router;