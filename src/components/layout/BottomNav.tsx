"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  LayoutDashboard,
  Inbox,
  Users,
  ShoppingCart,
  CalendarCheck,
} from "lucide-react";

const mobileNav = [
  { href: "/dashboard",    label: "Inicio",      icon: LayoutDashboard },
  { href: "/solicitudes",  label: "Solicitudes", icon: Inbox, badge: true },
  { href: "/clientes",     label: "Clientes",    icon: Users },
  { href: "/ventas",       label: "Ventas",      icon: ShoppingCart },
  { href: "/seguimientos", label: "Agenda",      icon: CalendarCheck },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: pendingRequests } = trpc.requests.pendingCount.useQuery(undefined, { staleTime: 60_000 });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-50 safe-area-pb shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <ul className="flex items-stretch">
        {mobileNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const badgeCount = item.badge ? (pendingRequests ?? 0) : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 w-full transition-all duration-150 relative",
                  active ? "text-mk-pink" : "text-gray-400 hover:text-gray-600"
                )}>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-mk-pink" />
                )}
                <div className="relative">
                  <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-mk-pink text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-semibold tracking-tight", active ? "text-mk-pink" : "text-gray-400")}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
