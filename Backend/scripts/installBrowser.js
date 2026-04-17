const { execSync } = require("child_process");
const path = require("path");

const isRender = Boolean(process.env.RENDER);
const forceInstall = String(process.env.FORCE_PUPPETEER_INSTALL || "").toLowerCase() === "true";

if (!isRender && !forceInstall) {
  console.log("[postinstall] Skipping Puppeteer Chrome install (not Render). Set FORCE_PUPPETEER_INSTALL=true to force.");
  process.exit(0);
}

const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, "..", ".cache", "puppeteer");

try {
  console.log(`[postinstall] Installing Puppeteer Chrome to cache: ${cacheDir}`);
  execSync("npx puppeteer browsers install chrome", {
    stdio: "inherit",
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: cacheDir,
    },
  });
  console.log("[postinstall] Puppeteer Chrome install completed.");
} catch (error) {
  console.error("[postinstall] Failed to install Puppeteer Chrome:", error.message);
  process.exit(1);
}
