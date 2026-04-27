import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

async function main() {
  const mdPath = resolve(root, "CHANGE_LOG.md");
  const htmlPath = resolve(root, "CHANGE_LOG.html");

  const md = await readFile(mdPath, "utf8");

  // Convert markdown to simple HTML
  let html = md
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);

  const fullHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Changelog</title>
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: "Segoe UI", Tahoma, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1f1f1f;
        background: #ffffff;
      }
      h1 { margin: 0 0 12px; font-size: 20px; }
      h2 { margin: 16px 0 8px; font-size: 16px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 4px; }
      h3 { margin: 12px 0 6px; font-size: 14px; color: #34495e; }
      ul { margin: 0 0 10px; padding-left: 18px; }
      li { margin: 4px 0; }
      strong { color: #2980b9; }
    </style>
  </head>
  <body>
${html}
  </body>
</html>`;

  await writeFile(htmlPath, fullHtml, "utf8");
  console.log("CHANGELOG.html generated from CHANGELOG.md");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
