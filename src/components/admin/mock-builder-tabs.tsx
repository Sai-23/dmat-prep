import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function MockBuilderTabs({ active }: { active: "build" | "created" }) {
  return (
    <nav aria-label="Mock Builder views" className="flex w-fit rounded-lg border border-workspace-border bg-surface-low p-1">
      {[
        { key: "build", href: "/admin/tests/new", label: "Build Mock" },
        { key: "created", href: "/admin/tests", label: "Created Mocks" },
      ].map((item) => (
        <Link
          aria-current={active === item.key ? "page" : undefined}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            active === item.key ? "bg-surface-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface",
          )}
          href={item.href as Route}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
