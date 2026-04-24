/**
 * Limpieza de catálogo:
 * 1. Elimina entradas que no son productos reales
 * 2. Filtra imágenes contaminadas (carrusel "También te puede gustar", badges)
 *
 * Uso: npm run cleanup
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

// Entradas que no son productos reales
const FAKE_PRODUCT_NAMES = [
  "Carreras Corporativas",
  "Cosmetic Sponges",
  "MirrorMe Web: Probador Virtual",
];

// Fragmentos de URL que identifican imágenes NO válidas para ningún producto
const BAD_IMAGE_FRAGMENTS = [
  // Carrusel "También te puede gustar" — imágenes de otros productos que se cuelan
  "mary-kay-timewise-repair-set-new_",
  "245209-018-CC-Cream-verylight-US-cmyk-Hi-Res",
  "739009-UNL-GB-226-TWR-DayCream_",
  "739009-UNL-GB-159-TWR-Regimen",
  "739009-UNL-GB-029-TWR-Serum-Regimen",
  // Badges / sellos de calidad / premios
  "/Badge/",
  "QualityTestedSeal",
  "quality-tested",
  "Dermatologist-Seal",
  "GH.QualityTestedSeal",
  "AwardsLogos",
  "2025_Awards",
  "Good-Housekeeping",
  // SVGs e iconos
  "svg-icon",
  "mk-icons",
  // Imágenes de navegación / categorías
  "navigation",
  "category%20",
];

function isValidImage(url: string): boolean {
  const low = url.toLowerCase();
  if (low.endsWith(".svg")) return false;
  for (const frag of BAD_IMAGE_FRAGMENTS) {
    if (low.includes(frag.toLowerCase())) return false;
  }
  return true;
}

async function main() {
  console.log("\n🧹 Mary Kay — Limpieza de catálogo");
  console.log("====================================\n");

  // ── 1. Eliminar entradas falsas ────────────────────────────────────────────
  console.log("1️⃣  Eliminando entradas no-producto...");
  for (const name of FAKE_PRODUCT_NAMES) {
    const deleted = await prisma.product.deleteMany({ where: { name } });
    if (deleted.count > 0) console.log(`   ✓ Eliminado: "${name}"`);
    else console.log(`   · No encontrado: "${name}"`);
  }

  // ── 2. Limpiar imágenes contaminadas ──────────────────────────────────────
  console.log("\n2️⃣  Limpiando imágenes contaminadas...");
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
    where: { images: { isEmpty: false } },
  });

  let cleaned = 0;
  let totalRemoved = 0;

  for (const p of products) {
    const before = p.images.length;
    const after = p.images.filter(isValidImage);
    const removed = before - after.length;

    if (removed > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: after },
      });
      cleaned++;
      totalRemoved += removed;
      console.log(`   ✓ ${p.name.slice(0, 50).padEnd(50)} ${before} → ${after.length} imgs (-${removed})`);
    }
  }

  if (cleaned === 0) console.log("   · Ninguna imagen necesitaba limpieza");

  // ── 3. Resumen final ───────────────────────────────────────────────────────
  const totalProducts = await prisma.product.count();
  const noImages = await prisma.product.count({ where: { images: { isEmpty: true } } });
  const withDesc = await prisma.product.count({ where: { description: { not: null } } });

  console.log(`\n✅ Completado`);
  console.log(`   Productos limpiados: ${cleaned} (${totalRemoved} imágenes contaminantes eliminadas)`);
  console.log(`\n📊 Estado del catálogo:`);
  console.log(`   Total productos: ${totalProducts}`);
  console.log(`   Con descripción: ${withDesc}`);
  console.log(`   Sin imágenes: ${noImages}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); process.exit(1); });
