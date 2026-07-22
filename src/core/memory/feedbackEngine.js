import fs from "fs";

const FILE = "./performanceMemory.json";

function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function logPerformance({ type, platform }) {
  const data = load();

  if (!data[type]) data[type] = {};
  if (!data[type][platform]) data[type][platform] = 0;

  data[type][platform] += 1;

  save(data);
}

export function getBestPlatform(type) {
  const data = load();

  if (!data[type]) return null;

  return Object.entries(data[type]).sort((a, b) => b[1] - a[1])[0]?.[0];
}