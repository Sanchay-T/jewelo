// Goal 00 intentionally contains no product schema. Goal 02 replaces this file
// with output from the linked Supabase branch via `pnpm db:types`.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
