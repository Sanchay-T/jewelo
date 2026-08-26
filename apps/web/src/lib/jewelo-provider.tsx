"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { MockJeweloClient } from "./mock-client";
import type { DesignInput, Role, ScenarioId } from "./types";
import type {
  LegacyDesign as Design,
  LegacyJeweloClient as JeweloClient,
  LegacySpikeState as SpikeState,
} from "./legacy-direction-compat";

interface JeweloContextValue {
  client: JeweloClient;
  state: SpikeState;
  design?: Design;
  createDesign(input: DesignInput): Promise<Design>;
  setRole(role: Role): Promise<void>;
  setScenario(scenario: ScenarioId): Promise<void>;
  refresh(): void;
}

const JeweloContext = createContext<JeweloContextValue | null>(null);

export function JeweloProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new MockJeweloClient(undefined, false), []);
  const pathname = usePathname();
  const [state, setState] = useState<SpikeState>(() => client.getState());

  const refresh = useCallback(() => {
    const next = client.getState();
    setState((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  }, [client]);

  useEffect(() => {
    const unsubscribe = client.onChange(refresh);
    void client.hydrate();
    return unsubscribe;
  }, [client, refresh]);

  useEffect(() => {
    if (!/^\/(en|ar)\/?$/.test(pathname)) void client.setResumePath(pathname);
  }, [client, pathname]);

  const value = useMemo<JeweloContextValue>(
    () => ({
      client,
      state,
      design: state.activeDesignId
        ? state.designs.find((item) => item.id === state.activeDesignId)
        : undefined,
      async createDesign(input) {
        const { spellingConfirmed, ...draftInput } = input;
        void spellingConfirmed;
        const created = await client.createDraft(draftInput);
        const draft = await client.updateDraft(created.id, {
          spellingConfirmed: true,
        });
        return client.approveRevision({
          draftId: draft.id,
          specification: input,
        });
      },
      async setRole(role) {
        await client.setRole(role);
      },
      async setScenario(scenario) {
        await client.setScenario(scenario);
      },
      refresh,
    }),
    [client, refresh, state],
  );

  return (
    <JeweloContext.Provider value={value}>{children}</JeweloContext.Provider>
  );
}

export function useJewelo() {
  const value = useContext(JeweloContext);
  if (!value) throw new Error("useJewelo must be used within JeweloProvider");
  return value;
}
