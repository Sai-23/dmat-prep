"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNavigation } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

export function SiteHeaderNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-2 lg:flex">
      {primaryNavigation.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface",
              isActive && "bg-primary-muted text-primary ring-1 ring-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
