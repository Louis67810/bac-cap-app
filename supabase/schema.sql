create table if not exists public.learning_state (
  device_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.learning_state enable row level security;

create policy "device state is publicly readable"
on public.learning_state for select using (true);

create policy "device state is publicly writable"
on public.learning_state for insert with check (true);

create policy "device state is publicly updatable"
on public.learning_state for update using (true);
