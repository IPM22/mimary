/**
 * One-time migration: split legacy FollowUpType into (type, contactMode).
 *
 * Before:  type = CALL | WHATSAPP | VISIT | DELIVERY | POST_SALE | ...
 * After:   type = OTHER (for legacy contact-mode rows), contactMode = CALL | WHATSAPP | IN_PERSON
 *
 * Run with: npx tsx scripts/split-followup-types.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updates: { from: string; toType: string; toMode: string }[] = [
    { from: "CALL", toType: "OTHER", toMode: "CALL" },
    { from: "WHATSAPP", toType: "OTHER", toMode: "WHATSAPP" },
    { from: "VISIT", toType: "OTHER", toMode: "IN_PERSON" },
  ];

  for (const u of updates) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "FollowUp" SET "type" = $1::"FollowUpType", "contactMode" = $2::"ContactMode" WHERE "type" = $3::"FollowUpType" AND "contactMode" IS NULL`,
      u.toType,
      u.toMode,
      u.from
    );
    console.log(`  ${u.from.padEnd(10)} → type=${u.toType}, contactMode=${u.toMode}  (${result} rows)`);
  }

  const remaining = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "FollowUp" WHERE "type" IN ('CALL', 'WHATSAPP', 'VISIT')`
  );
  console.log(`\nRows still using legacy type values: ${remaining[0]?.count ?? 0}`);
  console.log("Done. You can now safely remove CALL/WHATSAPP/VISIT from the FollowUpType enum.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
