import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isThemePreference, type ThemePreference } from "@/lib/theme";
import { getEnv } from "@/lib/validators/env";

import "./globals.css";

const env = getEnv();

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "dMAT Prep",
  description:
    "Independent preparation platform for realistic dMAT practice, mock tests, Computer Science preparation, and performance analytics.",
};

async function getProfileTheme(): Promise<ThemePreference> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "system";

    const { data } = await supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", user.id)
      .maybeSingle();
    return isThemePreference(data?.theme_preference)
      ? data.theme_preference
      : "system";
  } catch {
    return "system";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profileTheme = await getProfileTheme();

  return (
    <html
      lang="en"
      className="h-full scroll-smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme={profileTheme}>
          <div className="relative flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
