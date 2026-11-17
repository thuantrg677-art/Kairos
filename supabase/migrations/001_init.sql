-- ============================================================
-- KAIROS · Database (giai đoạn 1, kèm sẵn bảng cho giai đoạn 2–4)
-- Cách dùng: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy lại nhiều lần cũng không sao, dữ liệu cũ không mất.
--
-- Nguyên tắc bảo mật: mọi bảng đều bật Row Level Security (RLS).
-- Mỗi người chỉ đọc/ghi được những dòng có user_id là của chính mình.
-- ============================================================

-- ---------- 1. Hồ sơ người dùng (1 dòng cho mỗi tài khoản) ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '',
  theme         text not null default 'tan-rung'
                check (theme in ('tan-rung', 'dinh-tuyet', 'linh-lan', 'giay-kem', 'trang-den', 'pastel')),
  dark_mode     text not null default 'system' check (dark_mode in ('system', 'light', 'dark')),
  timezone      text not null default 'Asia/Ho_Chi_Minh',
  onboarded_at  timestamptz,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- Tự tạo hồ sơ khi có người đăng ký (Google hoặc email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tài khoản đã có từ trước (nếu có) cũng được tạo hồ sơ
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------- 2. Mục tiêu dài hạn (tầm nhìn 3–5 năm) ----------
create table if not exists public.visions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  area        text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);

-- ---------- 3. Chu kỳ 12 tuần ----------
create table if not exists public.cycles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'active' check (status in ('active', 'done')),
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  check (end_date > start_date)
);

-- ---------- 4. Mục tiêu ngắn hạn (mỗi mục tiêu = một cây trong vườn) ----------
-- Khóa ngoại kép (…_id, user_id) đảm bảo mục tiêu chỉ gắn được vào tầm nhìn/chu kỳ của CHÍNH người đó.
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cycle_id    uuid not null,
  vision_id   uuid not null,
  title       text not null check (char_length(title) between 1 and 300),
  measure     text not null default '',
  due_date    date not null,
  plant       text not null default 'sen' check (plant in ('sen', 'ly', 'linh-lan', 'tan-tron', 'thong')),
  status      text not null default 'active' check (status in ('active', 'done', 'dropped')),
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (cycle_id, user_id) references public.cycles (id, user_id) on delete cascade,
  foreign key (vision_id, user_id) references public.visions (id, user_id) on delete restrict
);

-- ---------- 5. Đầu việc ----------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  goal_id          uuid,
  title            text not null check (char_length(title) between 1 and 300),
  kind             text not null default 'once' check (kind in ('recurring', 'once')),
  weekdays         smallint[] not null default '{}',          -- 1 = thứ Hai … 7 = Chủ nhật
  due_date         date,
  estimate_min     integer not null default 30 check (estimate_min between 1 and 1440),
  leverage         text not null default 'normal' check (leverage in ('high', 'normal')),  -- high = việc 20%
  leverage_reason  text not null default '',
  leverage_source  text not null default 'manual' check (leverage_source in ('manual', 'ai')),
  important        boolean not null default false,            -- deadline quan trọng: nhắc trước 7/3/1 ngày
  done_at          timestamptz,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (id, user_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

-- ---------- 6. Mỗi lần tick hoàn thành ----------
create table if not exists public.task_completions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id     uuid not null,
  date        date not null,
  points      smallint not null default 1 check (points between 1 and 3),   -- số giọt nước 💧
  created_at  timestamptz not null default now(),
  unique (task_id, date),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

-- ---------- 7. Lịch cố định trong tuần ----------
create table if not exists public.fixed_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  weekday     smallint not null check (weekday between 1 and 7),
  start_min   smallint not null check (start_min between 0 and 1439),      -- phút tính từ 0h
  end_min     smallint not null check (end_min between 1 and 1440),
  color       text not null default 'blue',
  created_at  timestamptz not null default now(),
  check (end_min > start_min)
);

-- ---------- 8. Việc được xếp vào ngày/giờ nào ----------
create table if not exists public.schedule_blocks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id       uuid not null,
  date          date not null,
  start_min     smallint check (start_min between 0 and 1439),             -- null = làm trong ngày, chưa xếp giờ
  duration_min  smallint not null default 30 check (duration_min between 5 and 720),
  source        text not null default 'manual' check (source in ('manual', 'auto', 'ai')),
  created_at    timestamptz not null default now(),
  unique (task_id, date),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

-- ---------- 9. Nháp (hộp thư ghi nhanh) ----------
create table if not exists public.inbox_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 2000),
  processed_at  timestamptz,
  task_id       uuid,
  created_at    timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete set null (task_id)
);

-- ============================================================
-- Bảng dùng từ giai đoạn 2 trở đi (tạo sẵn để sau này không phải sửa)
-- ============================================================

-- GĐ2: phiên Focus
create table if not exists public.focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id      uuid references public.tasks (id) on delete set null,
  goal_id      uuid references public.goals (id) on delete set null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  planned_min  integer not null default 25,
  actual_sec   integer not null default 0,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- GĐ2: đếm lượt gọi AI mỗi ngày (chỉ server được ghi)
create table if not exists public.ai_usage (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null,
  calls    integer not null default 0,
  primary key (user_id, day)
);

-- GĐ3: nhật ký ngày
create table if not exists public.journals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        date not null,
  energy      smallint check (energy between 1 and 5),
  did         text not null default '',
  improve     text not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- GĐ3: nhìn lại tuần
create table if not exists public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start  date not null,
  planned     integer not null default 0,
  done        integer not null default 0,
  ai_review   jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

-- GĐ4: thiết bị nhận Web Push
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text not null default '',
  created_at  timestamptz not null default now()
);

-- GĐ4: thông báo trong app (biểu tượng chuông). Chỉ server được tạo.
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null default '',
  url         text not null default '/',
  dedupe_key  text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- ---------- Chỉ mục giúp truy vấn nhanh ----------
create index if not exists visions_user_idx on public.visions (user_id);
create index if not exists cycles_user_idx on public.cycles (user_id);
create index if not exists goals_user_idx on public.goals (user_id);
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists tasks_goal_idx on public.tasks (goal_id);
create index if not exists task_completions_user_date_idx on public.task_completions (user_id, date);
create index if not exists fixed_events_user_idx on public.fixed_events (user_id);
create index if not exists schedule_blocks_user_date_idx on public.schedule_blocks (user_id, date);
create index if not exists inbox_items_user_idx on public.inbox_items (user_id);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, started_at);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles: xem của mình" on public.profiles;
create policy "profiles: xem của mình" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles: tạo của mình" on public.profiles;
create policy "profiles: tạo của mình" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "profiles: sửa của mình" on public.profiles;
create policy "profiles: sửa của mình" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Các bảng dữ liệu cá nhân: chủ sở hữu được làm mọi thứ, người khác không thấy gì
do $$
declare
  t text;
begin
  foreach t in array array[
    'visions', 'cycles', 'goals', 'tasks', 'task_completions', 'fixed_events',
    'schedule_blocks', 'inbox_items', 'focus_sessions', 'journals', 'weekly_reviews', 'push_subscriptions'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "chỉ chủ sở hữu" on public.%I', t);
    execute format(
      'create policy "chỉ chủ sở hữu" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Bảng chỉ server ghi: người dùng chỉ được xem (và đánh dấu đã đọc thông báo)
alter table public.ai_usage enable row level security;
drop policy if exists "ai_usage: xem của mình" on public.ai_usage;
create policy "ai_usage: xem của mình" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

alter table public.notifications enable row level security;
drop policy if exists "notifications: xem của mình" on public.notifications;
create policy "notifications: xem của mình" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "notifications: đánh dấu đã đọc" on public.notifications;
create policy "notifications: đánh dấu đã đọc" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Quyền truy cập qua API: chỉ người đã đăng nhập, khách vãng lai không có quyền gì
grant select, insert, update on public.profiles to authenticated;
grant select on public.ai_usage to authenticated;
grant select, update on public.notifications to authenticated;
revoke all on public.profiles, public.visions, public.cycles, public.goals, public.tasks,
  public.task_completions, public.fixed_events, public.schedule_blocks, public.inbox_items,
  public.focus_sessions, public.ai_usage, public.journals, public.weekly_reviews,
  public.push_subscriptions, public.notifications
  from anon;
