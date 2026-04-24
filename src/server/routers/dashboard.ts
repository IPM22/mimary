import { router, protectedProcedure } from "../trpc";

async function getConsultantIds(ctx: any) {
  const user = ctx.user;
  if (user.role === "ADMIN") {
    const all = await ctx.prisma.user.findMany({ where: { active: true }, select: { id: true } });
    return all.map((u: any) => u.id);
  }
  const children = await ctx.prisma.user.findMany({
    where: { parentId: user.id, active: true },
    select: { id: true },
  });
  return [user.id, ...children.map((c: any) => c.id)];
}

export const dashboardRouter = router({
  // Fast: KPI numbers only (today/month stats) — renders immediately
  kpis: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const consultantIds = await getConsultantIds(ctx);

    const [todaySales, monthSales, pendingFollowUpsToday, pendingRequests] = await Promise.all([
      ctx.prisma.sale.aggregate({
        where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfDay, lt: endOfDay } },
        _sum: { total: true },
        _count: true,
      }),
      ctx.prisma.sale.aggregate({
        where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      ctx.prisma.followUp.count({
        where: { consultantId: { in: consultantIds }, status: "PENDING", scheduledDate: { gte: startOfDay, lt: endOfDay } },
      }),
      ctx.prisma.productRequest.count({
        where: { consultantId: { in: consultantIds }, status: "PENDING" },
      }),
    ]);

    return {
      today: { salesTotal: Number(todaySales._sum.total ?? 0), salesCount: todaySales._count, followUps: pendingFollowUpsToday, requests: pendingRequests },
      month: { salesTotal: Number(monthSales._sum.total ?? 0), salesCount: monthSales._count },
    };
  }),

  // Slower: recent activity, birthdays, stock, ranking — loads after KPIs
  activity: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const isManager = ctx.user.role === "DIRECTORA" || ctx.user.role === "ADMIN";

    const consultantIds = await getConsultantIds(ctx);

    const [lowStockItems, recentSales, allBirthdays] = await Promise.all([
      ctx.prisma.inventoryItem
        .findMany({ where: { userId: { in: consultantIds } }, include: { product: { select: { name: true } } }, take: 10 })
        .then((items: any[]) => items.filter((i) => i.quantity <= i.alertThreshold).slice(0, 5)),
      ctx.prisma.sale.findMany({
        where: { consultantId: { in: consultantIds } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { consultant: { select: { name: true } }, client: { select: { name: true } } },
      }),
      ctx.prisma.client.findMany({
        where: { userId: { in: consultantIds }, birthday: { not: null } },
        select: { id: true, name: true, birthday: true, phone: true },
      }),
    ]);

    const upcomingBirthdays = allBirthdays.filter((c: any) => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      const next = thisYear > now ? thisYear : new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
      const diff = next.getTime() - now.getTime();
      return diff >= 0 && diff <= 7 * 86400000;
    });

    let consultantRanking: Array<{ consultantId: string; user: any; total: number }> | null = null;
    if (isManager) {
      const byConsultant = await ctx.prisma.sale.groupBy({
        by: ["consultantId"],
        where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
      });
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: byConsultant.map((r: any) => r.consultantId) } },
        select: { id: true, name: true, avatar: true },
      });
      consultantRanking = byConsultant.map((r: any) => ({
        ...r,
        user: users.find((u: any) => u.id === r.consultantId),
        total: Number(r._sum.total ?? 0),
      }));
    }

    return { lowStock: lowStockItems, recentSales, upcomingBirthdays, consultantRanking };
  }),

  // Keep legacy summary for any other consumers
  summary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const isManager = ctx.user.role === "DIRECTORA" || ctx.user.role === "ADMIN";
    const consultantIds = await getConsultantIds(ctx);

    const [todaySales, monthSales, pendingFollowUpsToday, pendingRequests, lowStockItems, recentSales, allBirthdays] =
      await Promise.all([
        ctx.prisma.sale.aggregate({ where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfDay, lt: endOfDay } }, _sum: { total: true }, _count: true }),
        ctx.prisma.sale.aggregate({ where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } }, _sum: { total: true }, _count: true }),
        ctx.prisma.followUp.count({ where: { consultantId: { in: consultantIds }, status: "PENDING", scheduledDate: { gte: startOfDay, lt: endOfDay } } }),
        ctx.prisma.productRequest.count({ where: { consultantId: { in: consultantIds }, status: "PENDING" } }),
        ctx.prisma.inventoryItem.findMany({ where: { userId: { in: consultantIds } }, include: { product: { select: { name: true } } }, take: 5 }).then((items: any[]) => items.filter((i) => i.quantity <= i.alertThreshold)),
        ctx.prisma.sale.findMany({ where: { consultantId: { in: consultantIds } }, orderBy: { createdAt: "desc" }, take: 5, include: { consultant: { select: { name: true } }, client: { select: { name: true } } } }),
        ctx.prisma.client.findMany({ where: { userId: { in: consultantIds }, birthday: { not: null } }, select: { id: true, name: true, birthday: true, phone: true } }),
      ]);

    const upcomingBirthdays = allBirthdays.filter((c: any) => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      const next = thisYear > now ? thisYear : new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
      return next.getTime() - now.getTime() >= 0 && next.getTime() - now.getTime() <= 7 * 86400000;
    });

    let consultantRanking: any = null;
    if (isManager) {
      const byConsultant = await ctx.prisma.sale.groupBy({ by: ["consultantId"], where: { consultantId: { in: consultantIds }, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } }, _sum: { total: true }, orderBy: { _sum: { total: "desc" } } });
      const users = await ctx.prisma.user.findMany({ where: { id: { in: byConsultant.map((r: any) => r.consultantId) } }, select: { id: true, name: true, avatar: true } });
      consultantRanking = byConsultant.map((r: any) => ({ ...r, user: users.find((u: any) => u.id === r.consultantId), total: Number(r._sum.total ?? 0) }));
    }

    return {
      today: { salesTotal: Number(todaySales._sum.total ?? 0), salesCount: todaySales._count, followUps: pendingFollowUpsToday, requests: pendingRequests },
      month: { salesTotal: Number(monthSales._sum.total ?? 0), salesCount: monthSales._count },
      lowStock: lowStockItems, recentSales, upcomingBirthdays, consultantRanking,
    };
  }),
});
