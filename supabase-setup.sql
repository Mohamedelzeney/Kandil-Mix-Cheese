-- Safe to re-run. Run in Supabase → SQL Editor. Then replace OWNER_EMAIL at the bottom and run that part after creating the user.
create table if not exists public.products (
  id text primary key,
  name text not null check (length(trim(name)) > 0),
  description text default '',
  category text not null,
  category_label text not null,
  badge text,
  price numeric not null check (price >= 0),
  weight text,
  image text,
  rating numeric default 0,
  reviews_count int default 0,
  spicy_level int default 3,
  ingredients jsonb default '[]',
  variants jsonb not null default '[]',   -- [{weight, price, image}]
  available boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create or replace function public.is_admin() returns boolean
  language sql security definer set search_path = public stable
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins for select using (user_id = auth.uid());

alter table public.products enable row level security;
drop policy if exists "public can read products" on public.products;
create policy "public can read products" on public.products for select using (true);
drop policy if exists "admin insert" on public.products;
create policy "admin insert" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update" on public.products;
create policy "admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.products;
create policy "admin delete" on public.products for delete to authenticated using (public.is_admin());

-- Image storage
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admin upload images" on storage.objects;
create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin update images" on storage.objects;
create policy "admin update images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin delete images" on storage.objects;
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- After creating the owner in Authentication → Users, register them as admin:
-- insert into public.admins (user_id) select id from auth.users where email = 'OWNER_EMAIL';
