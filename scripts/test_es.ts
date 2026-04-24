import puppeteer from "puppeteer";

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "es-US,es;q=0.9,en;q=0.8" });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media", "websocket"].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  const url = "https://www.marykay.com/es/skincare/collection/clear-proof/clearproof-deepcleansing-charcoal-mask-301029/301029US10094148.html";
  console.log("Loading:", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    const name = document.querySelector("h1")?.textContent?.trim();
    
    const images: string[] = [];
    document.querySelectorAll("img[src*='demandware']").forEach((img) => {
      const src = (img as HTMLImageElement).src;
      if (src && !images.includes(src.split("?")[0])) images.push(src.split("?")[0]);
    });

    const detailEl =
      document.querySelector(".product-detail") ||
      document.querySelector("[class*='product-detail']") ||
      document.body;
    const fullText = (detailEl as HTMLElement)?.innerText?.replace(/\s+/g, " ").trim() || "";

    function extractSection(text: string, heading: string, stopHeadings: string[]): string | undefined {
      const idx = text.indexOf(heading);
      if (idx === -1) return undefined;
      const start = idx + heading.length;
      let end = text.length;
      for (const h of stopHeadings) {
        const ni = text.indexOf(h, start + 1);
        if (ni !== -1 && ni < end) end = ni;
      }
      const result = text.slice(start, end).trim();
      return result.length > 5 ? result : undefined;
    }

    const ALL_HEADINGS = [
      "Descripción del producto", "Información general", "Ingredientes clave",
      "Lista completa de ingredientes", "Cómo funciona", "Consejos de aplicación", "Aplicación",
    ];

    return {
      name,
      imagesCount: images.length,
      imagesSample: images.slice(0, 2),
      description: extractSection(fullText, "Descripción del producto", ALL_HEADINGS)?.slice(0, 150),
      generalInfo: extractSection(fullText, "Información general", ALL_HEADINGS)?.slice(0, 150),
      benefits: extractSection(fullText, "Ingredientes clave", ALL_HEADINGS)?.slice(0, 150),
      ingredients: extractSection(fullText, "Lista completa de ingredientes", ALL_HEADINGS)?.slice(0, 150),
      howItWorks: extractSection(fullText, "Cómo funciona", ALL_HEADINGS)?.slice(0, 150),
      howToUse: extractSection(fullText, "Consejos de aplicación", ALL_HEADINGS)?.slice(0, 150),
      textLength: fullText.length,
    };
  });

  console.log("\n=== RESULTADO ===");
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

test().catch(console.error);
