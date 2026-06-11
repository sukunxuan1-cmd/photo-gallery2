-- 云端共享弹幕建表脚本
-- 在 Supabase 控制台 → SQL Editor 里整段粘贴执行一次即可
create table if not exists public.danmaku (
  id bigint generated always as identity primary key,
  photo text not null,
  msg text not null check (char_length(msg) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists danmaku_photo_idx
  on public.danmaku (photo, created_at);

-- 开启行级安全：匿名访客只能读和写入弹幕，不能改、不能删
alter table public.danmaku enable row level security;

drop policy if exists "anon read" on public.danmaku;
create policy "anon read" on public.danmaku
  for select to anon using (true);

drop policy if exists "anon write" on public.danmaku;
create policy "anon write" on public.danmaku
  for insert to anon with check (true);

-- ===== 照片点赞 =====
create table if not exists public.likes (
  photo text primary key,
  count int not null default 0
);

alter table public.likes enable row level security;

drop policy if exists "anon read likes" on public.likes;
create policy "anon read likes" on public.likes
  for select to anon using (true);

-- 不开放 insert/update：访客只能通过下面的函数 +1，无法篡改数字
create or replace function public.like_photo(p text)
returns int
language sql
security definer
set search_path = public
as $$
  insert into likes (photo, count) values (p, 1)
  on conflict (photo) do update set count = likes.count + 1
  returning count;
$$;

grant execute on function public.like_photo(text) to anon;
