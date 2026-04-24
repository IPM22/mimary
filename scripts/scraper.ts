/**
 * Scraper de catálogo Mary Kay — versión española (/es/)
 * Uso: npm run scrape
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const BASE = "https://www.marykay.com";
const DELAY_MIN = 800;
const DELAY_MAX = 1800;

const CATEGORIES = [
  // Skin Care
  { url: `${BASE}/es/skincare`, name: "Skin Care" },
  { url: `${BASE}/es/skincare/collection/timewise`, name: "Skin Care", subcategory: "TimeWise" },
  { url: `${BASE}/es/skincare/collection/timewise-repair`, name: "Skin Care", subcategory: "TimeWise Repair" },
  { url: `${BASE}/es/skincare/collection/clinical-solutions`, name: "Skin Care", subcategory: "Clinical Solutions" },
  { url: `${BASE}/es/skincare/collection/clear-proof`, name: "Skin Care", subcategory: "Clear Proof" },
  { url: `${BASE}/es/skincare/product/cleanser`, name: "Skin Care", subcategory: "Limpiadores" },
  { url: `${BASE}/es/skincare/product/serum-and-oil`, name: "Skin Care", subcategory: "Sueros" },
  { url: `${BASE}/es/skincare/product/eye-care`, name: "Skin Care", subcategory: "Contorno de Ojos" },
  { url: `${BASE}/es/skincare/product/mask`, name: "Skin Care", subcategory: "Mascarillas" },
  { url: `${BASE}/es/skincare/product/skin-care-product-type-moisturizer`, name: "Skin Care", subcategory: "Hidratantes" },
  { url: `${BASE}/es/skincare/product/sets`, name: "Skin Care", subcategory: "Sets" },
  // Maquillaje
  { url: `${BASE}/es/makeup`, name: "Color" },
  { url: `${BASE}/es/makeup/eyes`, name: "Color", subcategory: "Ojos" },
  { url: `${BASE}/es/makeup/lips`, name: "Color", subcategory: "Labios" },
  { url: `${BASE}/es/makeup/face`, name: "Color", subcategory: "Rostro" },
  { url: `${BASE}/es/makeup/face/cc-cream`, name: "Color", subcategory: "CC Cream" },
  { url: `${BASE}/es/makeup/face/foundation`, name: "Color", subcategory: "Base" },
  { url: `${BASE}/es/makeup/face/blush`, name: "Color", subcategory: "Rubor" },
  { url: `${BASE}/es/makeup/face/bronzer`, name: "Color", subcategory: "Bronceador" },
  { url: `${BASE}/es/makeup/face/concealer`, name: "Color", subcategory: "Corrector" },
  { url: `${BASE}/es/makeup/face/powder`, name: "Color", subcategory: "Polvo" },
  { url: `${BASE}/es/makeup/face/primer`, name: "Color", subcategory: "Primer" },
  { url: `${BASE}/es/makeup/eyes/mascara`, name: "Color", subcategory: "Máscara" },
  { url: `${BASE}/es/makeup/eyes/eyeliner`, name: "Color", subcategory: "Delineador" },
  { url: `${BASE}/es/makeup/eyes/eye-shadow`, name: "Color", subcategory: "Sombra" },
  { url: `${BASE}/es/makeup/lips/lipstick`, name: "Color", subcategory: "Labial" },
  { url: `${BASE}/es/makeup/lips/lip-gloss`, name: "Color", subcategory: "Brillo de Labios" },
  { url: `${BASE}/es/makeup/lips/lip-liner`, name: "Color", subcategory: "Delineador de Labios" },
  { url: `${BASE}/es/makeup/brushes-applicators`, name: "Color", subcategory: "Brochas" },
  // Body & Sun
  { url: `${BASE}/es/body-care`, name: "Body Care" },
  { url: `${BASE}/es/sun-care`, name: "Sun Care" },
  // Fragrancias
  { url: `${BASE}/es/fragrance`, name: "Fragrance" },
  { url: `${BASE}/es/fragrance/womens-fragrances`, name: "Fragrance", subcategory: "Mujer" },
  { url: `${BASE}/es/fragrance/mens-fragrances`, name: "Fragrance", subcategory: "Hombre" },
  // Novedades y sets
  { url: `${BASE}/es/new-products`, name: "Novedades" },
  { url: `${BASE}/es/gift-sets`, name: "Sets y Regalos" },
];

const INVALID_NAMES = ["uh oh", "product promise", "skip to", "find a consultant", "sign in", "ibcsearch", "beauty!", "promesa"];

function isValidName(name: string) {
  if (!name || name.length < 3 || name.length > 250) return false;
  const lower = name.toLowerCase();
  return !INVALID_NAMES.some((b) => lower.includes(b));
}

// URLs de producto en español: terminan en /{SKU}.html
// SKU puede ser alfanumérico corto como "4US", "12345USN", etc.
function isProductUrl(url: string) {
  return (
    url.includes("marykay.com/es/") &&
    /\/[A-Z0-9]{2,}\.html$/i.test(url) &&
    !url.includes("#") &&
    !url.includes("product-promise") &&
    !url.includes("ibcSearch")
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function randomDelay() {
  return sleep(Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN));
}
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ── Puppeteer helpers ────────────────────────────────────────────────────────

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1440, height: 900 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "es-US,es;q=0.9,en;q=0.8" });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media", "websocket"].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

async function collectProductUrls(page: Page, catUrl: string): Promise<string[]> {
  try {
    const res = await page.goto(catUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!res || res.status() >= 400) return [];

    // Scroll para activar lazy load
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => window.scrollBy(0, 600), 200);
        setTimeout(() => { clearInterval(timer); resolve(); }, 6000);
      });
    });
    await sleep(1000);

    const links: string[] = await page.evaluate(() => {
      const urls: string[] = [];
      const seen = new Set<string>();
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (href && !seen.has(href)) { seen.add(href); urls.push(href); }
      });
      return urls;
    });

    return links.filter(isProductUrl);
  } catch {
    return [];
  }
}

// ── Scrape de producto individual ────────────────────────────────────────────

type ProductData = {
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  description?: string;
  generalInfo?: string;
  benefits?: string;
  howItWorks?: string;
  howToUse?: string;
  images: string[];
  ingredients?: string;
  mkUrl: string;
  sku?: string;
};

async function scrapeProduct(
  page: Page,
  url: string,
  category: string,
  subcategory?: string
): Promise<ProductData | null> {
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!res || res.status() >= 400) return null;
    await page.waitForSelector("h1", { timeout: 15000 }).catch(() => {});
    // Scroll para activar lazy-load de imágenes del producto
    await page.evaluate(`window.scrollBy(0, 400)`);
    await sleep(800);

    // Pasamos el código como string para evitar que esbuild inyecte __name
    const data = await page.evaluate(`(function() {
      var name =
        (document.querySelector('h1.product-name') || {}).textContent ||
        (document.querySelector('h1[itemprop="name"]') || {}).textContent ||
        (document.querySelector('.product-detail__name') || {}).textContent ||
        (document.querySelector('h1') || {}).textContent || '';
      name = name.trim();

      var images = [];
      var seen = {};
      function isValidImg(src) {
        if (!src || src.indexOf('http') !== 0) return false;
        var low = src.toLowerCase();
        if (low.indexOf('1x1') !== -1 || low.indexOf('placeholder') !== -1) return false;
        if (low.endsWith('.svg')) return false;
        if (low.indexOf('svg-icons') !== -1) return false;
        if (low.indexOf('/images/logo') !== -1) return false;
        if (low.indexOf('naviagtion') !== -1 || low.indexOf('navigation%20images') !== -1) return false;
        if (low.indexOf('category%20images') !== -1) return false;
        if (low.indexOf('mk-icons-arrow') !== -1) return false;
        return true;
      }
      function addImg(src) {
        var clean = (src || '').split('?')[0];
        if (isValidImg(clean) && !seen[clean]) { seen[clean] = 1; images.push(clean); }
      }

      // Prioridad: imágenes del área principal del producto
      document.querySelectorAll('.primary-images img, .product-images img, [class*="product-image"] img, .pdp-images img, .slick-track img').forEach(function(img) {
        addImg(img.src);
        addImg(img.dataset.src || '');
        addImg(img.dataset.lazySrc || '');
      });

      // Fallback: cualquier img demandware que no sea UI
      if (images.length === 0) {
        document.querySelectorAll('img[src*="demandware"]').forEach(function(img) {
          addImg(img.src);
          addImg(img.dataset.src || '');
          addImg(img.dataset.lazySrc || '');
        });
      }

      var skuMatch = window.location.href.match(/\\/([A-Z0-9]{2,})\\.html$/i);
      var sku = skuMatch ? skuMatch[1] : '';

      var detailEl = document.querySelector('.product-detail') ||
        document.querySelector('[class*="product-detail"]') ||
        document.body;
      var fullText = detailEl.innerText ? detailEl.innerText.replace(/\\s+/g, ' ').trim() : '';

      function extractSection(text, heading, stops) {
        var idx = text.indexOf(heading);
        if (idx === -1) return '';
        var start = idx + heading.length;
        var end = text.length;
        for (var i = 0; i < stops.length; i++) {
          var ni = text.indexOf(stops[i], start + 1);
          if (ni !== -1 && ni < end) end = ni;
        }
        var r = text.slice(start, end).trim();
        return r.length > 5 ? r : '';
      }

      var H = ['Descripción del producto','Información general','Ingredientes clave','Lista completa de ingredientes','Cómo funciona','Consejos de aplicación','Aplicación'];
      var descEl = document.querySelector('[class*="product-description"]') || document.querySelector('[itemprop="description"]');
      var description = extractSection(fullText, 'Descripción del producto', H) || (descEl ? descEl.textContent.trim() : '');
      var generalInfo = extractSection(fullText, 'Información general', H);
      var benefits = extractSection(fullText, 'Ingredientes clave', H);
      var ingEl = document.querySelector('[class*="ingredient"]') || document.querySelector('#ingredients');
      var ingredients = extractSection(fullText, 'Lista completa de ingredientes', H) || (ingEl ? ingEl.textContent.trim() : '');
      var howItWorks = extractSection(fullText, 'Cómo funciona', H);
      var howToUse = extractSection(fullText, 'Consejos de aplicación', H) || extractSection(fullText, 'Aplicación', H);

      return { name: name, description: description, generalInfo: generalInfo, benefits: benefits,
               ingredients: ingredients, howItWorks: howItWorks, howToUse: howToUse,
               images: images.slice(0, 8), sku: sku };
    })()`
    ) as any;

    if (!data?.name || !isValidName(data.name)) return null;

    return {
      name: data.name,
      slug: slugify(data.name),
      category,
      subcategory,
      description: data.description || undefined,
      generalInfo: data.generalInfo || undefined,
      benefits: data.benefits || undefined,
      ingredients: data.ingredients || undefined,
      howItWorks: data.howItWorks || undefined,
      howToUse: data.howToUse || undefined,
      images: data.images,
      mkUrl: url,
      sku: data.sku ? data.sku.slice(0, 50) : undefined,
    };
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌸 Mary Kay — Scraper catálogo v5 (español /es/)");
  console.log("=================================================\n");

  const log = await prisma.scraperLog.create({ data: { status: "RUNNING" } });
  let browser: Browser | null = null;
  let found = 0, updated = 0, created = 0, errs = 0;
  const scrapedSlugs = new Set<string>();
  const productMap = new Map<string, { category: string; subcategory?: string }>();

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await setupPage(browser);

    // ── FASE 1: Recolectar URLs ──────────────────────────────────────────────
    console.log("📋 Fase 1: Recopilando URLs de productos...\n");
    for (const cat of CATEGORIES) {
      process.stdout.write(`  📁 ${cat.name}${cat.subcategory ? "/" + cat.subcategory : ""}... `);
      const urls = await collectProductUrls(page, cat.url);
      let newCount = 0;
      for (const u of urls) {
        if (!productMap.has(u)) {
          productMap.set(u, { category: cat.name, subcategory: cat.subcategory });
          newCount++;
        }
      }
      console.log(`${urls.length} urls (${newCount} nuevas)`);
      await randomDelay();
    }

    console.log(`\n  → Total URLs únicas: ${productMap.size}\n`);

    if (productMap.size === 0) {
      console.log("⚠️  Sin URLs en modo headless. Intentando con navegador visible...\n");
      await browser.close();

      browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const visPage = await setupPage(browser);
      process.stdout.write("  📁 Skin Care (visible)... ");
      const urls = await collectProductUrls(visPage, `${BASE}/es/skincare`);
      console.log(`${urls.length} urls`);
      for (const u of urls) productMap.set(u, { category: "Skin Care" });
    }

    // ── FASE 2: Detalle de cada producto ─────────────────────────────────────
    console.log("📦 Fase 2: Scrapeando detalle + descargando imágenes...\n");
    let i = 0;
    for (const [url, { category, subcategory }] of Array.from(productMap)) {
      i++;
      process.stdout.write(`  [${i}/${productMap.size}] `);
      await randomDelay();

      const data = await scrapeProduct(page, url, category, subcategory);
      if (!data) { errs++; process.stdout.write(`✗ sin datos\n`); continue; }

      found++;
      scrapedSlugs.add(data.slug);

      try {
        const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
        if (existing) {
          await prisma.product.update({
            where: { slug: data.slug },
            data: {
              name: data.name,
              description: data.description,
              generalInfo: data.generalInfo,
              benefits: data.benefits,
              ingredients: data.ingredients,
              howItWorks: data.howItWorks,
              howToUse: data.howToUse,
              images: data.images,
              mkUrl: data.mkUrl,
              sku: data.sku,
              discontinued: false,
            },
          });
          updated++;
          process.stdout.write(`✓ ${data.name.slice(0, 50)} [${data.images.length} imgs]\n`);
        } else {
          await prisma.product.create({ data });
          created++;
          process.stdout.write(`✨ ${data.name.slice(0, 50)} [${data.images.length} imgs]\n`);
        }
      } catch {
        scrapedSlugs.add(data.slug);
        process.stdout.write(`↺ dup: ${data.name.slice(0, 40)}\n`);
      }
    }

    // ── FASE 3: Marcar discontinuados ────────────────────────────────────────
    if (scrapedSlugs.size > 0) {
      const disc = await prisma.product.updateMany({
        where: { slug: { notIn: Array.from(scrapedSlugs) }, discontinued: false },
        data: { discontinued: true },
      });
      if (disc.count > 0) console.log(`\n⚠️  ${disc.count} productos marcados como discontinuados`);
    }

    await prisma.scraperLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        productsFound: found,
        productsUpdated: updated,
        productsCreated: created,
        errors: errs,
        status: "DONE",
      },
    });

    console.log(`\n✅ Completado — Nuevos: ${created} | Actualizados: ${updated} | Errores: ${errs}\n`);
  } catch (e) {
    await prisma.scraperLog.update({
      where: { id: log.id },
      data: { finishedAt: new Date(), status: "FAILED", errorDetails: (e as Error).message },
    });
    console.error("\n❌ Fallido:", e);
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

main();
