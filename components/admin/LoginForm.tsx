"use client";

import { useState, useTransition } from "react";

import { signInAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ denied }: { denied: boolean }) {
  const [error, setError] = useState<string | null>(
    denied ? "Bu hesap yönetim paneline erişemez." : null,
  );
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await signInAdmin(
            String(form.get("email") ?? ""),
            String(form.get("password") ?? ""),
          );
          if (result?.status === "error") setError(result.message);
        });
      }}
    >
      <h1 className="text-2xl font-extrabold text-brand-950">
        Teşekkür Panosu Yönetimi
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Yalnızca İdari İşler yöneticileri giriş yapabilir.
      </p>

      <div className="mt-6">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2"
        />
      </div>
      <div className="mt-4">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-6 w-full" disabled={isPending}>
        {isPending ? "Giriş yapılıyor..." : "Giriş yap"}
      </Button>
    </form>
  );
}
