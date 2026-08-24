"use client";

import { ReactNode, useSyncExternalStore, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const PASSWORD_STORAGE_KEY = "admin_password";
const PASSWORD_EVENT = "admin-password-change";

function readStoredPassword(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(PASSWORD_STORAGE_KEY);
}

function subscribeToPasswordStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(PASSWORD_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(PASSWORD_EVENT, handleChange);
  };
}

function notifyPasswordStoreChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PASSWORD_EVENT));
}

function useStoredAdminPassword() {
  return useSyncExternalStore(subscribeToPasswordStore, readStoredPassword, () => null);
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const stored = useStoredAdminPassword();

  const checkResult = useQuery(
    api.prompts.checkPassword,
    stored ? { password: stored } : "skip",
  );

  if (stored && checkResult === true) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    window.sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
    notifyPasswordStoreChanged();
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
  return useStoredAdminPassword() ?? "";
}
