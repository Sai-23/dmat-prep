"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";

import type { AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder?: string;
};

type AuthFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  fields: Field[];
  submitLabel: string;
  pendingLabel: string;
  next?: string;
  footer?: { text: string; label: string; href: Route };
  forgotPassword?: boolean;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  next,
  footer,
  forgotPassword,
}: AuthFormProps) {
  const initialAuthState: AuthActionState = { status: "idle" };
  const [state, formAction, pending] = useActionState(action, initialAuthState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {fields.map((field) => (
        <div className="space-y-2" key={field.name}>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-slate-800" htmlFor={field.name}>
              {field.label}
            </label>
            {forgotPassword && field.name === "password" ? (
              <Link
                className="text-sm font-medium text-[var(--accent)] hover:underline"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
          <input
            autoComplete={field.autoComplete}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-100"
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            type={field.type}
            aria-describedby={`${field.name}-error`}
            aria-invalid={Boolean(state.errors?.[field.name])}
          />
          {state.errors?.[field.name]?.map((error) => (
            <p className="text-sm text-red-700" id={`${field.name}-error`} key={error}>
              {error}
            </p>
          ))}
        </div>
      ))}

      {state.message ? (
        <div
          className={
            state.status === "success"
              ? "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              : "rounded-xl bg-red-50 p-3 text-sm text-red-800"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <Button className="w-full" disabled={pending} type="submit">
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer ? (
        <p className="text-center text-sm text-slate-600">
          {footer.text}{" "}
          <Link className="font-semibold text-[var(--accent)] hover:underline" href={footer.href}>
            {footer.label}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
