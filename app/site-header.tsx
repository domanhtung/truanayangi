"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ChefHat, Utensils } from "lucide-react";

const tabs = [
  { href: "/", label: "Trang chủ", icon: ChefHat },
  { href: "/so-tay-mon-an", label: "Sổ tay món ăn", icon: BookOpen },
  { href: "/ky-nghi", label: "Kỳ nghỉ", icon: CalendarDays },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-[#253f30] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-[#eff2e6]">
          <span className="grid size-9 place-items-center rounded-full bg-white/12">
            <Utensils className="size-4" aria-hidden="true" />
          </span>
          Lễ này ăn gì?
        </Link>
        <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-1.5">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-white/15 text-white" : "text-[#dde7d6] hover:bg-white/10"}`}
              >
                <Icon className="size-4" aria-hidden="true" /> {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
