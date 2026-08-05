import { redirect } from "next/navigation";

import { registerAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/guards";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-md px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Save practice history, review mistakes, and build a focused study plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={registerAction}
            fields={[
              { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "Your name" },
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
              { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
            ]}
            submitLabel="Create account"
            pendingLabel="Creating account..."
            footer={{ text: "Already have an account?", label: "Sign in", href: "/login" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
