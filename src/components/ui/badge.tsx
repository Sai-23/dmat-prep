import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em]",
  {
    variants: {
      variant: {
        default: "bg-primary-muted text-primary ring-1 ring-primary/30",
        subtle:
          "bg-surface-container text-on-surface-variant ring-1 ring-workspace-border",
        success:
          "bg-success-container text-success-container-foreground ring-1 ring-success",
        warning:
          "bg-warning-container text-warning-container-foreground ring-1 ring-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
