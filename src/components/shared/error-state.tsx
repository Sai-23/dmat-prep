import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorStateProps = {
  title: string;
  description: string;
};

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <Card className="border-rose-200 bg-rose-50/80">
      <CardHeader className="flex flex-row items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-slate-700">{description}</p>
      </CardContent>
    </Card>
  );
}
