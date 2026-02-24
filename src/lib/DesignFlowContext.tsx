"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface DesignFlowState {
  activeDesignId: string | null;
  currentStep: string | null;
  language: string;
}

interface DesignFlowContextType extends DesignFlowState {
  setActiveDesign: (designId: string, step: string) => void;
  updateStep: (step: string) => void;
  setLanguage: (lang: string) => void;
  clearDesign: () => void;
  getResumeUrl: () => string | null;
}

const DesignFlowContext = createContext<DesignFlowContextType | null>(null);

const STORAGE_KEY = "jewelo-design-flow";

function loadState(): DesignFlowState {
  if (typeof window === "undefined") {
    return { activeDesignId: null, currentStep: null, language: "en" };
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { activeDesignId: null, currentStep: null, language: "en" };
}

function saveState(state: DesignFlowState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function DesignFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignFlowState>(loadState);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  const getResumeUrl = useCallback(() => {
    if (!state.activeDesignId) return null;
    switch (state.currentStep) {
      case "crafting":
        return `/en/design/crafting?designId=${state.activeDesignId}`;
      case "results":
        return `/en/design/results/${state.activeDesignId}`;
      case "engraving":
        return `/en/design/engraving/${state.activeDesignId}`;
      case "order":
        return `/en/design/order/${state.activeDesignId}`;
      default:
        return `/en/design/customize?lang=${state.language}`;
    }
  }, [state]);

  return (
    <DesignFlowContext.Provider
      value={{ ...state, setActiveDesign, updateStep, setLanguage, clearDesign, getResumeUrl }}
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
