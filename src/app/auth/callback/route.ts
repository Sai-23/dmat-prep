import { type NextRequest, NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set(
    "error",
    "The confirmation link is invalid or has expired. Please try again.",
  );
  return NextResponse.redirect(errorUrl);
}
