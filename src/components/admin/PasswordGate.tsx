"use client";

import { useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const pw = sessionStorage.getItem("admin_password");
    if (pw) setStored(pw);
  }, []);

  const checkResult = useQuery(
    api.prompts.checkPassword,
    stored ? { password: stored } : "skip",
  );

  if (stored && checkResult === true) {
    return <>{children}</>;
  }

  if (stored && checkResult === false) {
    sessionStorage.removeItem("admin_password");
    setStored(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    sessionStorage.setItem("admin_password", password);
    setStored(password);
    setError(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold text-white mb-6">Admin Access</h1>
        {(error || (stored && checkResult === false)) && (
          <p className="text-red-400 text-sm mb-4">Invalid password</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          autoFocus
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded transition-colors"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}

export function useAdminPassword(): string {
  const [pw, setPw] = useState("");
  useEffect(() => {
    setPw(sessionStorage.getItem("admin_password") ?? "");
  }, []);
  return pw;
}
