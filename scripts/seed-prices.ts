/**
 * Asigna precios tentativos a todos los productos sin precio.
 * Uso: npm run seed:prices
 *
 * El precio de compra se estima al 60% del precio de venta
 * (descuento típico de consultoras Mary Kay).
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// Precio de venta tentativo por categoría (DOP)
const PRICE_BY_CATEGORY: Record<string, number> = {
  "Fragrance":       3500,
  "Color":           1200,
  "Skin Care":       2500,
  "Clear Proof":     2000,
  "Hidratantes":     2500,
  "Sets y Regalos":  5500,
  "Collection":      2000,
  "New Products":    2000,
  "Novedades":       2000,
  "Shop the Set":    4500,
};

const DEFAULT_SALE_PRICE = 1800;
const PURCHASE_RATIO = 0.60; // precio de compra = 60% del precio de venta

async function main() {
  const products = await prisma.product.findMany({
    where: { salePrice: 0 },
    select: { id: true, name: true, category: true },
  });

  console.log(`\n📦 Productos sin precio: ${products.length}\n`);

  if (products.length === 0) {
    console.log("✅ Todos los productos ya tienen precio.\n");
    return;
  }

  let updated = 0;
  for (const p of products) {
    const salePrice = PRICE_BY_CATEGORY[p.category] ?? DEFAULT_SALE_PRICE;
    const purchasePrice = Math.round(salePrice * PURCHASE_RATIO);

    await prisma.product.update({
      where: { id: p.id },
      data: { salePrice, purchasePrice },
    });

    process.stdout.write(`  ✓ ${p.name} (${p.category}) → venta: RD$${salePrice} | compra: RD$${purchasePrice}\n`);
    updated++;
  }

  console.log(`\n✅ ${updated} productos actualizados con precios tentativos.\n`);
  console.log("💡 Ajusta los precios reales desde el catálogo → botón \"Precios\".\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
