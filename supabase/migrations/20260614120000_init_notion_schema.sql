-- Pages table
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  emoji text,
  parent_id uuid references public.pages(id) on delete cascade,
  is_expanded boolean not null default false,
  is_favorite boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pages_user_id_idx on public.pages (user_id);
create index pages_parent_id_idx on public.pages (parent_id);

-- Blocks table
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  content text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blocks_page_id_idx on public.blocks (page_id);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

-- RLS for pages
alter table public.pages enable row level security;

create policy "pages_select_own"
  on public.pages for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "pages_insert_own"
  on public.pages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "pages_update_own"
  on public.pages for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pages_delete_own"
  on public.pages for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS for blocks
alter table public.blocks enable row level security;

create policy "blocks_select_own"
  on public.blocks for select
  to authenticated
  using (
    page_id in (
      select id from public.pages where user_id = (select auth.uid())
    )
  );

create policy "blocks_insert_own"
  on public.blocks for insert
  to authenticated
  with check (
    page_id in (
      select id from public.pages where user_id = (select auth.uid())
    )
  );

create policy "blocks_update_own"
  on public.blocks for update
  to authenticated
  using (
    page_id in (
      select id from public.pages where user_id = (select auth.uid())
    )
  )
  with check (
    page_id in (
      select id from public.pages where user_id = (select auth.uid())
    )
  );

create policy "blocks_delete_own"
  on public.blocks for delete
  to authenticated
  using (
    page_id in (
      select id from public.pages where user_id = (select auth.uid())
    )
  );

-- Atomic block sync RPC
create or replace function public.sync_page_blocks(
  p_page_id uuid,
  p_blocks jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  incoming_ids uuid[];
  block_row jsonb;
  block_id uuid;
begin
  if not exists (
    select 1 from public.pages
    where id = p_page_id and user_id = (select auth.uid())
  ) then
    raise exception 'Page not found or access denied';
  end if;

  select coalesce(array_agg((elem->>'id')::uuid), '{}')
  into incoming_ids
  from jsonb_array_elements(p_blocks) as elem
  where elem->>'id' is not null and elem->>'id' <> '';

  delete from public.blocks
  where page_id = p_page_id
    and (incoming_ids = '{}' or id <> all(incoming_ids));

  for block_row in select * from jsonb_array_elements(p_blocks)
  loop
    block_id := nullif(block_row->>'id', '')::uuid;

    if block_id is not null and exists (
      select 1 from public.blocks where id = block_id and page_id = p_page_id
    ) then
      update public.blocks
      set
        type = block_row->>'type',
        content = coalesce(block_row->>'content', ''),
        sort_order = coalesce((block_row->>'sort_order')::int, 0)
      where id = block_id and page_id = p_page_id;
    else
      insert into public.blocks (page_id, type, content, sort_order)
      values (
        p_page_id,
        block_row->>'type',
        coalesce(block_row->>'content', ''),
        coalesce((block_row->>'sort_order')::int, 0)
      );
    end if;
  end loop;
end;
$$;
