import { router } from "./trpc";
import { authRouter } from "./routers/authRouter";
import { catalogRouter } from "./routers/catalog";
import { clientsRouter } from "./routers/clients";
import { inventoryRouter } from "./routers/inventory";
import { salesRouter } from "./routers/sales";
import { followUpsRouter } from "./routers/followups";
import { goalsRouter } from "./routers/goals";
import { consultantsRouter } from "./routers/consultants";
import { dashboardRouter } from "./routers/dashboard";
import { publicLinksRouter } from "./routers/publicLinks";
import { requestsRouter } from "./routers/requests";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  auth: authRouter,
  catalog: catalogRouter,
  clients: clientsRouter,
  inventory: inventoryRouter,
  sales: salesRouter,
  followUps: followUpsRouter,
  goals: goalsRouter,
  consultants: consultantsRouter,
  dashboard: dashboardRouter,
  publicLinks: publicLinksRouter,
  requests: requestsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
