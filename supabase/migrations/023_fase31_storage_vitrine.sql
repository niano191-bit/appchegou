-- Fase 31 — Storage público para imagens da vitrine (banners)
-- Upload só pelo painel Admin (API autenticada); leitura pública na home.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vitrine',
  'vitrine',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vitrine_public_read" on storage.objects;
drop policy if exists "vitrine_public_insert" on storage.objects;
drop policy if exists "vitrine_public_update" on storage.objects;
drop policy if exists "vitrine_public_delete" on storage.objects;

create policy "vitrine_public_read"
on storage.objects for select
using (bucket_id = 'vitrine');

create policy "vitrine_public_insert"
on storage.objects for insert
with check (bucket_id = 'vitrine');

create policy "vitrine_public_update"
on storage.objects for update
using (bucket_id = 'vitrine');

create policy "vitrine_public_delete"
on storage.objects for delete
using (bucket_id = 'vitrine');
