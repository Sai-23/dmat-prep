import { logoutAction } from "@/app/auth/actions";
import { PageShell } from "@/components/layout/page-shell";
import { ThemePreferenceForm } from "@/components/theme/theme-preference-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <PageShell
      eyebrow="Profile"
      title="Manage account and study preferences"
      description="Review your account details and securely end your current session."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your email is managed through Supabase Authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="mt-1 font-semibold text-on-surface">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Select a persistent Light, Dark, or System theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePreferenceForm />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
