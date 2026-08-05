"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  safeRedirectPath,
} from "@/lib/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { getEnv } from "@/lib/validators/env";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function validationError(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): AuthActionState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    errors: error.flatten().fieldErrors,
  };
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) return validationError(result.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return {
      status: "error",
      message: "Email or password is incorrect.",
    };
  }

  redirect(safeRedirectPath(formData.get("next")) as Route);
}

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) return validationError(result.error);

  const env = getEnv();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
        display_name: result.data.fullName,
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (data.session) redirect("/dashboard");

  return {
    status: "success",
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return validationError(result.error);

  const env = getEnv();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return validationError(result.error);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: result.data.password });
  if (error) return { status: "error", message: error.message };

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function saveThemePreferenceAction(
  preference: ThemePreference,
): Promise<{ saved: boolean; error: string | null }> {
  if (!isThemePreference(preference)) {
    return { saved: false, error: "Invalid theme preference." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: null };

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: preference })
    .eq("id", user.id);

  return error
    ? { saved: false, error: "Unable to save the profile theme." }
    : { saved: true, error: null };
}
