-- Goal 00 baseline: intentionally no product tables, policies, buckets, or data.
-- Recording this migration proves the remote migration seam without stealing
-- Goal 02's authoritative schema and RLS work.
do $$
begin
  null;
end
$$;
