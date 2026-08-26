import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export interface FoundationRecord {
  readonly id: string;
  readonly value: string;
}

export interface FoundationDataStore {
  put(record: FoundationRecord): Promise<void>;
  get(id: string): Promise<FoundationRecord | null>;
}

export class MockFoundationDataStore implements FoundationDataStore {
  readonly #records = new Map<string, FoundationRecord>();
  #nextFailure: Error | undefined;

  failNext(error = new Error("injected data failure")): void {
    this.#nextFailure = error;
  }

  async put(record: FoundationRecord): Promise<void> {
    this.#throwIfInjected();
    this.#records.set(record.id, record);
  }

  async get(id: string): Promise<FoundationRecord | null> {
    this.#throwIfInjected();
    return this.#records.get(id) ?? null;
  }

  #throwIfInjected(): void {
    if (this.#nextFailure) {
      const failure = this.#nextFailure;
      this.#nextFailure = undefined;
      throw failure;
    }
  }
}

export function createSupabaseDataClient(url: string, publishableKey: string) {
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
  });
}

export type { Database } from "./database.types";
