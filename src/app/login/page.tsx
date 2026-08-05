import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/auth/schemas";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect(safeRedirectPath(params.next));
  }

  return (
    <div className="mx-auto flex w-full max-w-md px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue your preparation and review your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
              {params.error}
            </p>
          ) : null}
          <AuthForm
            action={loginAction}
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
            ]}
            submitLabel="Sign in"
            pendingLabel="Signing in..."
            next={params.next}
            forgotPassword
            footer={{ text: "New to dMAT Prep?", label: "Create an account", href: "/register" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
