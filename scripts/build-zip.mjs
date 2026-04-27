import { createWriteStream } from "node:fs";
import { mkdir, rm, cp, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import archiver from "archiver";

const root = process.cwd();
const buildDir = resolve(root, "build");
const zipPath = resolve(root, "mannco-enhancer.zip");

async function run() {
  // Clean previous builds
  await rm(buildDir, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await mkdir(buildDir, { recursive: true });

  // Files to include in the zip
  const filesToCopy = [
    "manifest.json",
    "popup.html",
    "CHANGE_LOG.html",
    "CHANGE_LOG.md"
  ];

  for (const file of filesToCopy) {
    await cp(resolve(root, file), resolve(buildDir, file));
  }

  // Copy dist folder
  const distSrc = resolve(root, "dist");
  const distDst = resolve(buildDir, "dist");
  await mkdir(distDst, { recursive: true });
  
  const distFiles = await readdir(distSrc, { recursive: true });
  for (const file of distFiles) {
    const srcPath = resolve(distSrc, file);
    const dstPath = resolve(distDst, file);
    const stat = await import("node:fs").then(m => m.statSync(srcPath));
    if (stat.isDirectory()) {
      await mkdir(dstPath, { recursive: true });
    } else {
      await cp(srcPath, dstPath);
    }
  }

  // Copy assets
  const assetsSrc = resolve(root, "assets");
  const assetsDst = resolve(buildDir, "assets");
  await mkdir(assetsDst, { recursive: true });
  
  const assetFiles = await readdir(assetsSrc, { recursive: true });
  for (const file of assetFiles) {
    const srcPath = resolve(assetsSrc, file);
    const dstPath = resolve(assetsDst, file);
    const stat = await import("node:fs").then(m => m.statSync(srcPath));
    if (stat.isDirectory()) {
      await mkdir(dstPath, { recursive: true });
    } else {
      await cp(srcPath, dstPath);
    }
  }

  // Copy locales
  const localesSrc = resolve(root, "locales");
  const localesDst = resolve(buildDir, "locales");
  await mkdir(localesDst, { recursive: true });
  
  const localeFiles = await readdir(localesSrc);
  for (const file of localeFiles) {
    if (file.endsWith(".json")) {
      await cp(resolve(localesSrc, file), resolve(localesDst, file));
    }
  }

  // Create zip
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn("Archive warning:", err.message);
    } else {
      throw err;
    }
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(buildDir, false);
  await archive.finalize();

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
  });

  const stats = await import("node:fs").then(m => m.statSync(zipPath));
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ Build complete!`);
  console.log(`📦 Zip: ${zipPath}`);
  console.log(`📊 Size: ${sizeMb} MB (${stats.size} bytes)`);
  console.log(`\n🚀 Ready for Chrome Web Store upload!`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
