export interface MediaObject {
  readonly key: string;
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

export interface MediaStore {
  put(object: MediaObject): Promise<void>;
  get(key: string): Promise<MediaObject | null>;
}

export class MockMediaStore implements MediaStore {
  readonly #objects = new Map<string, MediaObject>();
  #nextFailure: Error | undefined;

  failNext(error = new Error("injected media failure")): void {
    this.#nextFailure = error;
  }

  async put(object: MediaObject): Promise<void> {
    this.#throwIfInjected();
    this.#objects.set(object.key, object);
  }

  async get(key: string): Promise<MediaObject | null> {
    this.#throwIfInjected();
    return this.#objects.get(key) ?? null;
  }

  #throwIfInjected(): void {
    if (this.#nextFailure) {
      const failure = this.#nextFailure;
      this.#nextFailure = undefined;
      throw failure;
    }
  }
}
