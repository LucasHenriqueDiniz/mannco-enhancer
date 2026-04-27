import { build } from "esbuild";
import { mkdir, rm, cp, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

async function run() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await build({
    entryPoints: {
      "background/service-worker": "src/background/service-worker.ts",
      "content/main": "src/content/main.ts",
      "popup/popup": "src/popup/popup.ts"
    },
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome110"],
    sourcemap: false,
    minify: false,
    logLevel: "info"
  });

  const localesSrc = resolve(root, "locales");
  const localesDst = resolve(dist, "locales");
  await mkdir(localesDst, { recursive: true });
  
  const files = await readdir(localesSrc);
  for (const file of files) {
    if (file.endsWith(".json")) {
      await cp(resolve(localesSrc, file), resolve(localesDst, file));
    }
  }

  // Copy changelog files to dist
  await cp(resolve(root, "CHANGE_LOG.md"), resolve(dist, "CHANGE_LOG.md"));
  await cp(resolve(root, "CHANGE_LOG.html"), resolve(dist, "CHANGE_LOG.html"));

  console.log("Build complete. Load this folder in chrome://extensions");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
