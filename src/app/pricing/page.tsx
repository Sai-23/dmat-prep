import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-2 lg:px-8">
      <Card>
        <CardHeader>
          <Badge variant="subtle">Free access</Badge>
          <CardTitle>Start with diagnostic and essential practice</CardTitle>
          <CardDescription>
            Ideal for first-time candidates who want to understand the exam format
            and establish a baseline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>Diagnostic test foundation</p>
          <p>Selected practice sessions</p>
          <p>Introductory analytics and revision signals</p>
        </CardContent>
      </Card>
      <Card className="border-blue-200 bg-blue-50/70">
        <CardHeader>
          <Badge>Premium preview</Badge>
          <CardTitle>Unlock full mock tests and deeper analytics</CardTitle>
          <CardDescription>
            Designed for students who want realistic exam simulation and structured,
            topic-driven improvement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            <p>Full mock-test engine and mini tests</p>
            <p>Expanded mistake notebook and recommendation engine</p>
            <p>Performance trends, timing analysis, and premium content access</p>
          </div>
          <Button asChild>
            <Link href="/register">Create your account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
