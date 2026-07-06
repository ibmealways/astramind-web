import fs from "fs";
import path from "path";
import { getLivePrice } from "./marketData.js";

const FILE_PATH = path.resolve("portfolio.json");

// ============================
// 📂 LOAD / SAVE
// ============================

function loadPortfolio() {
  if (!fs.existsSync(FILE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FILE_PATH));
}

function savePortfolio(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

// ============================
// ➕ ADD POSITION
// ============================

export function addPosition(symbol, amount, avgPrice) {
  const portfolio = loadPortfolio();

  portfolio[symbol] = {
    amount: Number(amount),
    avgPrice: Number(avgPrice),
  };

  savePortfolio(portfolio);
  return portfolio;
}

// ============================
// 📊 GET PORTFOLIO (WITH LIVE P/L)
// ============================

export async function getPortfolio() {
  const portfolio = loadPortfolio();

  const results = await Promise.all(
    Object.entries(portfolio).map(async ([symbol, pos]) => {
      const live = await getLivePrice(symbol);

      const current = live?.price || 0;
      const value = current * pos.amount;
      const cost = pos.avgPrice * pos.amount;
      const pnl = value - cost;

      return {
        symbol,
        amount: pos.amount,
        avgPrice: pos.avgPrice,
        current,
        value,
        pnl,
      };
    })
  );

  return results;
}