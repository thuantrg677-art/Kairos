-- ============================================================
-- KAIROS · Bản 2 (sau đợt dùng thử đầu tiên)
-- Cách dùng: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy lại nhiều lần cũng không sao, dữ liệu cũ không mất.
--
-- File này thêm:
--   1. 5 loài cây mới cho Vườn (lá kim, xương rồng, hướng dương, đồng tiền, hoa hồng)
--   2. "Việc mỗi ngày": việc nhỏ nằm dưới một đầu việc (cột tasks.parent_id)
--   3. Focus dạng nghi thức: ghi điều định làm, các bước, tự đánh giá hiệu quả
--   4. Trò chuyện với Trợ lý AI (bảng chat_messages) + những điều AI ghi nhớ về bạn (profiles.ai_context)
--   5. Lượt AI riêng cho phần trò chuyện (ai_usage.chat_calls + hàm ai_take_chat)
-- ============================================================

-- ---------- 1. Loài cây mới ----------
alter table public.goals drop constraint if exists goals_plant_check;
alter table public.goals add constraint goals_plant_check check (plant in (
  'sen', 'ly', 'linh-lan', 'tan-tron', 'thong',
  'la-kim', 'xuong-rong', 'huong-duong', 'dong-tien', 'hong'
));

-- ---------- 2. Việc mỗi ngày (con của một đầu việc) ----------
alter table public.tasks add column if not exists parent_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_parent_fk') then
    alter table public.tasks
      add constraint tasks_parent_fk foreign key (parent_id, user_id)
      references public.tasks (id, user_id) on delete cascade;
  end if;
end;
$$;
create index if not exists tasks_parent_idx on public.tasks (parent_id);

-- ---------- 3. Focus dạng nghi thức ----------
alter table public.focus_sessions add column if not exists intention  text not null default '';
alter table public.focus_sessions add column if not exists steps      jsonb not null default '[]'::jsonb;
alter table public.focus_sessions add column if not exists rating     smallint;
alter table public.focus_sessions add column if not exists reflection text not null default '';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'focus_sessions_rating_check') then
    alter table public.focus_sessions add constraint focus_sessions_rating_check check (rating between 1 and 3);
  end if;
end;
$$;

-- ---------- 4. Trò chuyện với Trợ lý AI ----------
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role        text not null check (role in ('user', 'ai')),
  content     text not null default '' check (char_length(content) <= 8000),
  meta        jsonb not null default '{}'::jsonb,   -- ảnh thu nhỏ, đề xuất của AI, gợi ý trả lời…
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;
drop policy if exists "chỉ chủ sở hữu" on public.chat_messages;
create policy "chỉ chủ sở hữu" on public.chat_messages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.chat_messages to authenticated;
revoke all on public.chat_messages from anon;

-- Những điều AI ghi nhớ về bối cảnh của bạn (danh sách câu ngắn, bạn xem và xóa được trong app)
alter table public.profiles add column if not exists ai_context jsonb not null default '[]'::jsonb;

-- ---------- 5. Lượt AI riêng cho phần trò chuyện ----------
alter table public.ai_usage add column if not exists chat_calls integer not null default 0;

create or replace function public.ai_take_chat(p_user uuid, p_day date, p_limit integer, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls integer;
begin
  if p_delta > 0 then
    insert into public.ai_usage as u (user_id, day, calls, chat_calls)
    values (p_user, p_day, 0, p_delta)
    on conflict (user_id, day) do update
      set chat_calls = u.chat_calls + p_delta
      where u.chat_calls + p_delta <= p_limit
    returning chat_calls into v_calls;
    if v_calls is null then
      return -1;
    end if;
    return v_calls;
  end if;

  update public.ai_usage
     set chat_calls = greatest(0, chat_calls + p_delta)
   where user_id = p_user and day = p_day
  returning chat_calls into v_calls;
  return coalesce(v_calls, 0);
end;
$$;

revoke all on function public.ai_take_chat(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_take_chat(uuid, date, integer, integer) to service_role;

-- Báo cho API của Supabase biết có cột/bảng mới
notify pgrst, 'reload schema';
