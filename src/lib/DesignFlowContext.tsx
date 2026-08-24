"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface DesignFlowState {
  activeDesignId: string | null;
  currentStep: string | null;
  language: string;
}

interface DesignFlowContextType extends DesignFlowState {
  sessionId: string | null;
  setActiveDesign: (designId: string, step: string) => void;
  updateStep: (step: string) => void;
  setLanguage: (lang: string) => void;
  clearDesign: () => void;
  getResumeUrl: () => string | null;
}

const DesignFlowContext = createContext<DesignFlowContextType | null>(null);

const FLOW_STORAGE_KEY = "jewelo-design-flow";
const SESSION_STORAGE_KEY = "jewelo-device-session-id";

function loadFlowState(): DesignFlowState {
  if (typeof window === "undefined") {
    return { activeDesignId: null, currentStep: null, language: "en" };
  }
  try {
    const stored = sessionStorage.getItem(FLOW_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { activeDesignId: null, currentStep: null, language: "en" };
}

function saveFlowState(state: DesignFlowState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function ensureSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return null;
  }
}

function getCurrentLocaleFromPath(): string {
  if (typeof window === "undefined") return "en";
  const [, maybeLocale] = window.location.pathname.split("/");
  return maybeLocale || "en";
}

export function DesignFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignFlowState>({
    activeDesignId: null,
    currentStep: null,
    language: "en",
  });
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setState(loadFlowState());
      setSessionId(ensureSessionId());
    });
  }, []);

  const setActiveDesign = useCallback((designId: string, step: string) => {
    setState((s) => ({ ...s, activeDesignId: designId, currentStep: step }));
  }, []);

  const updateStep = useCallback((step: string) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setState((s) => ({ ...s, language: lang }));
  }, []);

  const clearDesign = useCallback(() => {
    setState((s) => ({ ...s, activeDesignId: null, currentStep: null }));
  }, []);

  useEffect(() => {
    saveFlowState(state);
  }, [state]);

  const getResumeUrl = useCallback(() => {
    if (!state.activeDesignId) return null;

    const locale = getCurrentLocaleFromPath();
    switch (state.currentStep) {
      case "crafting":
        return `/${locale}/design/crafting?designId=${state.activeDesignId}`;
      case "results":
        return `/${locale}/design/results/${state.activeDesignId}`;
      case "engraving":
        return `/${locale}/design/engraving/${state.activeDesignId}`;
      case "order":
        return `/${locale}/design/order/${state.activeDesignId}`;
      default:
        return `/${locale}/design/customize?lang=${state.language}`;
    }
  }, [state]);

  return (
    <DesignFlowContext.Provider
      value={{
        ...state,
        sessionId,
        setActiveDesign,
        updateStep,
        setLanguage,
        clearDesign,
        getResumeUrl,
      }}
    >
      {children}
    </DesignFlowContext.Provider>
  );
}

export function useDesignFlow() {
  const ctx = useContext(DesignFlowContext);
  if (!ctx) throw new Error("useDesignFlow must be used within DesignFlowProvider");
  return ctx;
}
