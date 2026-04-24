/**
 * Simula exactamente el flujo del scraper: misma page, request interception,
 * categoria primero, luego detalle de producto
 */
import puppeteer from "puppeteer";

const BASE = "https://www.marykay.com";

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1440, height: 900 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "es-US,es;q=0.9,en;q=0.8" });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media", "websocket"].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  // --- Simular Fase 1: visitar categoría ---
  console.log("1. Visitando categoría skincare...");
  await page.goto(`${BASE}/es/skincare`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => window.scrollBy(0, 600), 200);
      setTimeout(() => { clearInterval(timer); resolve(); }, 6000);
    });
  });
  await new Promise(r => setTimeout(r, 1000));
  console.log("   Categoría cargada. URL:", page.url());

  // --- Simular Fase 2: visitar primer producto ---
  const PRODUCT_URL = "https://www.marykay.com/es/timewise-miracle-set-normal-dry-990312970/990312970US10217417.html";
  console.log("\n2. Visitando producto:", PRODUCT_URL);
  try {
    const res = await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("   Status:", res?.status());
    console.log("   URL final:", page.url());

    await page.waitForSelector("h1", { timeout: 15000 }).catch(e => console.log("   waitForSelector error:", e.message));
    await new Promise(r => setTimeout(r, 300));

    const result = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim();
      const title = document.title;
      const bodyPreview = document.body.innerText.slice(0, 300);
      return { h1, title, bodyPreview };
    });

    console.log("   H1:", result.h1);
    console.log("   Title:", result.title);
    console.log("   Body:", result.bodyPreview);
  } catch(e: any) {
    console.log("   ERROR:", e.message);
  }

  await browser.close();
}

main().catch(console.error);
