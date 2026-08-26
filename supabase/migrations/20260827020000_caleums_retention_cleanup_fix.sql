-- Immutable customer history cannot be updated, while trusted parent deletion
-- must remain possible for retention and account erasure.
drop trigger if exists revisions_immutable on public.design_revisions;
create trigger revisions_immutable before update on public.design_revisions
for each row execute function public.prevent_revision_mutation();

drop trigger if exists assets_immutable on public.assets;
create trigger assets_immutable before update on public.assets
for each row execute function public.prevent_revision_mutation();
