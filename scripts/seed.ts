/**
 * Seed inicial: crea el usuario ADMIN en Supabase Auth y en la BD.
 * Uso: npm run seed
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createSupabaseUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data.user.id;
}

async function main() {
  console.log("\n🌸 Mary Kay — Seed inicial\n");

  // ─── ADMIN ───────────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@marykay.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin2024";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`✓ Admin ya existe: ${adminEmail}`);
  } else {
    const supabaseId = await createSupabaseUser(adminEmail, adminPassword);
    const admin = await prisma.user.create({
      data: {
        supabaseId,
        name: "Administrador",
        email: adminEmail,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✨ Admin creado:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ID:       ${admin.id}`);
  }

  console.log("\n✅ Seed completado. Ya puedes iniciar sesión.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
