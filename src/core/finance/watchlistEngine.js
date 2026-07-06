import fs from "fs";
import path from "path";
import { getLivePrice } from "./marketData.js";

const FILE_PATH = path.resolve("watchlist.json");

function loadWatchlist() {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH));
}

function saveWatchlist(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

// ============================
// ➕ ADD SYMBOL
// ============================

export function addToWatchlist(symbol) {
  const list = loadWatchlist();

  if (!list.includes(symbol)) {
    list.push(symbol.toUpperCase());
    saveWatchlist(list);
  }

  return list;
}

// ============================
// 📊 GET WATCHLIST (LIVE DATA)
// ============================

export async function getWatchlist() {
  const list = loadWatchlist();

  const data = await Promise.all(
    list.map(async (symbol) => {
      const live = await getLivePrice(symbol);

      return {
        symbol,
        price: live?.price || 0,
        type: live?.type || "unknown",
      };
    })
  );

  return data;
}