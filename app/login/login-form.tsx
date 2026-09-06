"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not sign in.");
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setSubmitting(false);
    }
  };

  return (
    <form className="portal-form" onSubmit={(event) => void onSubmit(event)}>
      <label>
        Work email
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="portal-error">{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="portal-hint">
        Each trainee has a private inbox. Your session is not shared.
      </p>
    </form>
  );
}
