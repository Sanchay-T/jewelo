export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type RequestId = Brand<string, "RequestId">;

export type Result<TValue, TError extends Error = Error> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };
