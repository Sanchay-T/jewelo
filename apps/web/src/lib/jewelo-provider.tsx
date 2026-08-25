"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MockJeweloClient } from "./mock-client";
import type { Design, DesignInput, Role, ScenarioId, SpikeState } from "./types";

interface JeweloContextValue {
  client: MockJeweloClient;
  state: SpikeState;
  design?: Design;
  createDesign(input: DesignInput): Design;
  setRole(role: Role): void;
  setScenario(scenario: ScenarioId): void;
  refresh(): void;
}

const JeweloContext = createContext<JeweloContextValue | null>(null);

export function JeweloProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new MockJeweloClient(undefined, false), []);
  const pathname = usePathname();
  const [state, setState] = useState<SpikeState>(() => client.getState());

  useEffect(() => {
    const unsubscribe = client.onChange(() => setState(client.getState()));
    client.hydrate();
    return unsubscribe;
  }, [client]);

  useEffect(() => {
    if (!/^\/(en|ar)\/?$/.test(pathname)) client.setResumePath(pathname);
  }, [client, pathname]);

  const value = useMemo<JeweloContextValue>(() => ({
    client,
    state,
    design: state.activeDesignId ? state.designs.find((item) => item.id === state.activeDesignId) : undefined,
    createDesign(input) { return client.approveRevision(input); },
    setRole(role) { client.setRole(role); },
    setScenario(scenario) { client.setScenario(scenario); },
    refresh() { setState(client.getState()); },
  }), [client, state]);

  return <JeweloContext.Provider value={value}>{children}</JeweloContext.Provider>;
}

export function useJewelo() {
  const value = useContext(JeweloContext);
  if (!value) throw new Error("useJewelo must be used within JeweloProvider");
  return value;
}
