// Changelog page script — loaded externally to comply with Manifest V3 CSP
(function () {
  "use strict";

  function parseMarkdown(md) {
    return md
      .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
      .replace(/\n{2,}/g, "\n\n")
      .trim();
  }

  async function loadChangelog() {
    const container = document.getElementById("content");
    if (!container) return;

    try {
      const mdUrl = new URL("CHANGE_LOG.md", window.location.href).href;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(mdUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("HTTP " + response.status + " - " + response.statusText);
      }

      const md = await response.text();
      if (!md.trim()) {
        throw new Error("Changelog file is empty");
      }
      container.innerHTML = parseMarkdown(md);
    } catch (err) {
      console.error("[Changelog] Failed to load:", err);
      const message = err instanceof Error ? err.message : String(err);
      container.innerHTML =
        '<div id="error">' +
        "<strong>Failed to load changelog</strong><br/>" +
        message +
        '<br/><br/><span style="color: var(--muted); font-size: 12px;">' +
        "Make sure CHANGE_LOG.md exists in the extension root directory." +
        "</span></div>";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadChangelog);
  } else {
    loadChangelog();
  }
})();
