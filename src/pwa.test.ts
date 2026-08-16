// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PWA shell metadata", () => {
  it("keeps the installed app aligned with the dark theme", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    );

    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#0b0c1d");
    expect(manifest.background_color).toBe("#0b0c1d");
  });

  it("uses an opaque iOS status bar for the installed PWA", () => {
    const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

    expect(indexHtml).toContain(
      'apple-mobile-web-app-status-bar-style" content="black"',
    );
    expect(indexHtml).not.toContain("black-translucent");
  });
});
