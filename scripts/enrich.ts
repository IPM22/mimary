/**
 * Enriquecimiento de catálogo Mary Kay.
 * Lee las URLs ya guardadas en BD y extrae descripción, ingredientes, precio, etc.
 * Solo procesa productos con description=null.
 *
 * Uso: npm run enrich
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const DELAY_MIN = 900;
const DELAY_MAX = 1800;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function randomDelay() { return sleep(Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN)); }

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1440, height: 900 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "es-US,es;q=0.9,en;q=0.8" });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media", "websocket"].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  return page;
}

async function enrichProduct(page: Page, url: string) {
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
    if (!res || res.status() >= 400) return null;
    await page.waitForSelector("h1", { timeout: 12000 }).catch(() => {});
    await page.evaluate(`window.scrollBy(0, 400)`);
    await sleep(1000);

    const data = await page.evaluate(`(function() {
      // ── Detectar soft-404 ────────────────────────────────────────────────────
      var bodyText = document.body ? (document.body.innerText || '') : '';
      if (bodyText.indexOf('Oh oh') !== -1 || bodyText.indexOf('Uh oh') !== -1 ||
          bodyText.indexOf('never existed') !== -1 || bodyText.indexOf('nunca ha existido') !== -1) {
        return null;
      }

      // ── Precio ───────────────────────────────────────────────────────────────
      var price = 0;
      // Primero intentar con selectores específicos
      var priceSelectors = ['.price-sales','.product-price','[itemprop="price"]','.price','.sales','.pdp-price'];
      for (var pi = 0; pi < priceSelectors.length; pi++) {
        var pel = document.querySelector(priceSelectors[pi]);
        if (pel) {
          var ptext = (pel.textContent || '').trim();
          var pm = ptext.match(/\$([\d,]+\.\d{2})/);
          if (pm) { price = parseFloat(pm[1].replace(',', '')); break; }
        }
      }
      // Fallback: buscar precio en el área del título/producto (más amplia)
      if (!price) {
        var productHeader = document.querySelector('.product-detail-title, .product-detail-attrs, .product-name, .pdp-header, h1');
        var headerParent = productHeader ? (productHeader.parentElement || productHeader) : null;
        if (headerParent) {
          var headerText = (headerParent.textContent || '');
          var hm = headerText.match(/\$([\d,]+\.\d{2})/);
          if (hm) price = parseFloat(hm[1].replace(',', ''));
        }
      }
      // Fallback final: todo el body (busca el primer precio que aparezca)
      if (!price) {
        var bm = bodyText.match(/\$([\d,]+\.\d{2})/);
        if (bm) price = parseFloat(bm[1].replace(',', ''));
      }

      // ── Imágenes ─────────────────────────────────────────────────────────────
      var images = [];
      var seen = {};
      function isValidImg(src) {
        if (!src || src.indexOf('http') !== 0) return false;
        var low = src.toLowerCase();
        if (low.indexOf('1x1') !== -1 || low.indexOf('placeholder') !== -1) return false;
        if (low.endsWith('.svg')) return false;
        if (low.indexOf('svg-icon') !== -1 || low.indexOf('badge') !== -1) return false;
        if (low.indexOf('/images/logo') !== -1) return false;
        if (low.indexOf('navigation') !== -1) return false;
        if (low.indexOf('category%20') !== -1) return false;
        if (low.indexOf('qualitytested') !== -1 || low.indexOf('quality-tested') !== -1) return false;
        if ((low.indexOf('seal') !== -1 || low.indexOf('awards') !== -1) && low.indexOf('hi-res') === -1) return false;
        if (low.indexOf('mk-icons') !== -1) return false;
        return true;
      }
      function addImg(src) {
        var clean = (src || '').split('?')[0];
        if (isValidImg(clean) && !seen[clean]) { seen[clean] = 1; images.push(clean); }
      }
      document.querySelectorAll('.primary-images img, .product-images img, [class*="product-image"] img, .pdp-images img, .slick-track img').forEach(function(img) {
        addImg(img.src); addImg(img.dataset.src || ''); addImg(img.dataset.lazySrc || '');
      });
      if (images.length === 0) {
        document.querySelectorAll('img[src*="demandware"]').forEach(function(img) {
          addImg(img.src); addImg(img.dataset.src || ''); addImg(img.dataset.lazySrc || '');
        });
      }

      // ── Contenido del acordeón ────────────────────────────────────────────────
      // La key insight: .product-details-accordion contiene TODO el texto en
      // textContent aunque las secciones estén colapsadas
      var accordionEl = document.querySelector('.product-details-accordion');
      var rawText = accordionEl
        ? (accordionEl.textContent || '').replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim()
        : '';

      // Si no hay acordeón, intentar con el área de detalle general
      if (!rawText || rawText.length < 50) {
        var detailEl = document.querySelector('.product-detail') || document.querySelector('main');
        rawText = detailEl ? (detailEl.textContent || '').replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim() : '';
      }

      // ── Función de extracción de sección ─────────────────────────────────────
      function extractSection(text, headings, stops) {
        var bestIdx = -1;
        var bestHeading = '';
        for (var hi = 0; hi < headings.length; hi++) {
          var idx = text.indexOf(headings[hi]);
          if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
            bestIdx = idx;
            bestHeading = headings[hi];
          }
        }
        if (bestIdx === -1) return '';
        var start = bestIdx + bestHeading.length;
        var end = text.length;
        for (var si = 0; si < stops.length; si++) {
          var ni = text.indexOf(stops[si], start + 2);
          if (ni !== -1 && ni < end) end = ni;
        }
        var r = text.slice(start, end).trim();
        // Limpiar líneas vacías y espacios redundantes
        r = r.replace(/\\n{3,}/g, '\\n\\n').trim();
        return r.length > 10 ? r : '';
      }

      // Headings en español e inglés
      var ALL_STOPS = [
        'Descripción del producto','Información general','Ingredientes clave','Lista completa de ingredientes',
        'Cómo funciona','Consejos de aplicación','Aplicación','Cómo usar','¿Cómo aplicar?',
        'Beneficios clave','Declaraciones y beneficios','Resultados','Instrucciones',
        'Product Description','General Information','Key Ingredients','Full Ingredient List',
        'How It Works','Application Tips','How to Apply','How to Use','Key Benefits',
        'Product Claims','Premios','Awards'
      ];

      var description = extractSection(rawText, ['Descripción del producto','Product Description'], ALL_STOPS);
      var generalInfo  = extractSection(rawText, ['Información general','General Information'], ALL_STOPS);
      var benefits     = extractSection(rawText, ['Ingredientes clave','Key Ingredients','Beneficios clave','Key Benefits'], ALL_STOPS);
      var ingredients  = extractSection(rawText, ['Lista completa de ingredientes','Full Ingredient List'], ALL_STOPS);
      var howItWorks   = extractSection(rawText, ['Cómo funciona','How It Works','Declaraciones y beneficios','Product Claims'], ALL_STOPS);
      var howToUse     = extractSection(rawText, ['Consejos de aplicación','Aplicación','Cómo usar','¿Cómo aplicar?','Application Tips','How to Apply','How to Use'], ALL_STOPS);

      // Si howItWorks es vacío pero hay beneficios largos, moverlos allí
      if (!howItWorks && benefits && benefits.length > 200) {
        howItWorks = benefits;
        benefits = '';
      }

      return {
        description: description,
        generalInfo: generalInfo,
        benefits: benefits,
        ingredients: ingredients,
        howItWorks: howItWorks,
        howToUse: howToUse,
        images: images.slice(0, 8),
        price: price
      };
    })()`);

    return data as any;
  } catch {
    return null;
  }
}

async function main() {
  console.log("\n🌸 Mary Kay — Enriquecimiento de catálogo");
  console.log("==========================================\n");

  const products = await prisma.product.findMany({
    where: { description: null, mkUrl: { not: null } },
    select: { id: true, name: true, mkUrl: true, images: true },
    orderBy: [
      // Procesar primero los de /es/ (más probabilidades de éxito)
      { mkUrl: "asc" },
      { name: "asc" }
    ],
  });

  // Poner /es/ primero
  const sorted = [
    ...products.filter((p) => p.mkUrl?.includes("/es/")),
    ...products.filter((p) => !p.mkUrl?.includes("/es/")),
  ];

  console.log(`📋 ${sorted.length} productos sin descripción`);
  console.log(`   ${sorted.filter((p) => p.mkUrl?.includes("/es/")).length} con URL /es/ (alta prioridad)`);
  console.log(`   ${sorted.filter((p) => p.mkUrl?.includes("/en/")).length} con URL /en/ (baja prioridad)\n`);

  if (sorted.length === 0) { await prisma.$disconnect(); return; }

  let browser: Browser | null = null;
  let page: Page | null = null;
  let ok = 0, noContent = 0, is404 = 0, errs = 0;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    page = await setupPage(browser);

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const prefix = `[${String(i + 1).padStart(3)}/${sorted.length}]`;
      process.stdout.write(`${prefix} ${p.name.slice(0, 48).padEnd(48)} `);

      await randomDelay();

      const data = await enrichProduct(page!, p.mkUrl!);

      if (data === null) {
        is404++;
        process.stdout.write(`⊘ 404/error\n`);
        continue;
      }

      const hasContent = !!(data.description || data.generalInfo || data.benefits || data.howItWorks);
      const needsImages = p.images.length === 0 && data.images.length > 0;

      try {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            description:  data.description  || null,
            generalInfo:  data.generalInfo  || null,
            benefits:     data.benefits     || null,
            ingredients:  data.ingredients  || null,
            howItWorks:   data.howItWorks   || null,
            howToUse:     data.howToUse     || null,
            ...(data.price > 0 ? { basePrice: data.price } : {}),
            ...(needsImages ? { images: data.images } : {}),
          },
        });

        if (hasContent) {
          ok++;
          const tags: string[] = [];
          if (data.description) tags.push("desc");
          if (data.generalInfo) tags.push("info");
          if (data.benefits || data.howItWorks) tags.push("benef");
          if (data.ingredients) tags.push("ingred");
          if (data.howToUse) tags.push("uso");
          if (data.price > 0) tags.push(`$${data.price}`);
          if (needsImages) tags.push(`${data.images.length}imgs`);
          process.stdout.write(`✓ ${tags.join(" ")}\n`);
        } else {
          noContent++;
          const priceTag = data.price > 0 ? ` $${data.price}` : "";
          process.stdout.write(`· sin contenido${priceTag}\n`);
        }
      } catch (e: any) {
        errs++;
        process.stdout.write(`✗ ${e.message.slice(0, 40)}\n`);
      }

      // Reiniciar browser cada 25 productos para evitar memory leaks
      if ((i + 1) % 25 === 0 && i + 1 < sorted.length) {
        await browser!.close();
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        page = await setupPage(browser);
        console.log("  ♻️  Browser reiniciado\n");
      }
    }

    console.log(`\n✅ Completado`);
    console.log(`   ✓ Con contenido: ${ok}`);
    console.log(`   · Sin contenido: ${noContent}`);
    console.log(`   ⊘ 404/inaccesible: ${is404}`);
    console.log(`   ✗ Errores: ${errs}`);

    const remaining = await prisma.product.count({ where: { description: null } });
    const withPrice = await prisma.product.count({ where: { basePrice: { gt: 0 } } });
    console.log(`\n📊 Estado final: ${remaining} sin descripción, ${withPrice}/125 con precio\n`);

  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

main();
