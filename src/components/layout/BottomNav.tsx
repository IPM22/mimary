"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CalendarCheck,
} from "lucide-react";

const mobileNav = [
  { href: "/dashboard",    label: "Inicio",   icon: LayoutDashboard },
  { href: "/catalogo",     label: "Catálogo", icon: Package },
  { href: "/clientes",     label: "Clientes", icon: Users },
  { href: "/ventas",       label: "Ventas",   icon: ShoppingCart },
  { href: "/seguimientos", label: "Agenda",   icon: CalendarCheck },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-50 safe-area-pb shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <ul className="flex items-stretch">
        {mobileNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
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
