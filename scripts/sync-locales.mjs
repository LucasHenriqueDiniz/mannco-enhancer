import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const localeFiles = ["en.json", "es.json", "pt_BR.json", "ru.json"].map((name) => resolve(root, "locales", name));

function uniqueByLast(entries) {
  const map = new Map();
  for (const [key, value] of entries) {
    map.set(key, value);
  }
  return Object.fromEntries(Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  for (const filePath of localeFiles) {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    const deduped = uniqueByLast(Object.entries(json));
    await writeFile(filePath, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");
    console.log(`normalized ${filePath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
