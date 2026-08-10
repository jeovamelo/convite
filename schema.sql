create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  public_id text unique not null,
  token_hash text unique not null,
  quantidade_pessoas int not null default 1,
  status text not null default 'AVAILABLE',
  guest_name text,
  whatsapp text,
  checked_in_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone
);

-- ATENÇÃO: as colunas camelCase precisam de aspas duplas. Sem elas o
-- PostgreSQL grava tudo em minúsculo e o PostgREST passa a rejeitar os
-- campos id_fontSize / id_fontWeight / peoplePerInvite enviados pelo app
-- (erro PGRST204) — foi isso que impedia as configurações de salvar.
create table if not exists public.settings (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  qr_x int default 50,
  qr_y int default 50,
  qr_size int default 150,
  id_x int default 50,
  id_y int default 220,
  id_width int default 200,
  id_height int default 40,
  id_color text default '#FFD500',
  "id_fontSize" int default 24,
  "id_fontWeight" text default 'bold',
  quantity int default 120,
  "peoplePerInvite" int default 1,
  base_image text
);

insert into public.settings (id, name) values ('00000000-0000-0000-0000-000000000000', 'Padrão (Inicial)') on conflict do nothing;
