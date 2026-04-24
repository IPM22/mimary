import "server-only";

import { createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/root";

export async function trpcServer() {
  const ctx = await createTRPCContext();
  return appRouter.createCaller(ctx);
}
