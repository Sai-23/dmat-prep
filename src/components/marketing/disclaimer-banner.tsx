import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const DISCLAIMER =
  "dMAT Prep is an independent preparation platform and is not affiliated with or endorsed by the official dMAT examination authorities.";

export function DisclaimerBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{DISCLAIMER}</p>
    </div>
  );
}
