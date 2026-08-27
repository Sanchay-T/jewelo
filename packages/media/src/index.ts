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

/**
 * Supabase Storage reports an existing object either as HTTP 409 or as HTTP 400
 * carrying a 409 status code in its JSON body. Both mean the immutable object is
 * already stored, which is a tolerated idempotent outcome, not an upload failure.
 */
export function isDuplicateObject(response: Response, bodyText: string): boolean {
  if (response.status === 409) return true;
  return (
    response.status === 400 &&
    (bodyText.includes('"statusCode":"409"') || bodyText.includes("Duplicate"))
  );
}
