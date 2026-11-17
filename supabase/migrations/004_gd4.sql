-- ============================================================
-- KAIROS · Giai đoạn 4: thông báo (Web Push + chuông trong app) và nhịp nhắc 15 phút
-- Cách dùng: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy lại nhiều lần cũng không sao, dữ liệu cũ không mất.
--
-- Bảng push_subscriptions (thiết bị nhận thông báo) và notifications (chuông trong app)
-- đã có từ 001_init.sql. File này thêm:
--   1. Bảng kairos_config: cấu hình riêng của server (mã bí mật cho cron, cặp khóa VAPID…).
--      Chỉ server đọc được, người dùng không đọc được qua API.
--   2. Bật pg_cron + pg_net và hẹn giờ gọi Edge Function "tick" mỗi 15 phút.
--      Không cần sửa gì trong file: function tự ghi địa chỉ của nó vào kairos_config
--      ở lần được gọi đầu tiên (khi mở Cài đặt → Thông báo trong app).
-- ============================================================

-- ---------- 1. Cấu hình của server (đúng 1 dòng) ----------
create table if not exists public.kairos_config (
  id             boolean primary key default true check (id),
  -- Mã bí mật để function "tick" biết lời gọi đến từ cron chứ không phải người lạ
  tick_secret    text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- Địa chỉ project (https://xxxx.supabase.co): function tự điền
  base_url       text,
  -- Địa chỉ app (https://….vercel.app): function tự điền khi app gọi tới, dùng làm "người gửi" thông báo
  app_url        text,
  -- Cặp khóa VAPID cho Web Push: function tự tạo ở lần đầu nếu chưa có trong Secrets
  vapid_public   text,
  vapid_private  text,
  -- Lần chạy gần nhất của nhịp 15 phút (để app hiện "máy chủ nhắc đang chạy")
  last_tick_at   timestamptz,
  last_tick_note text not null default ''
);

insert into public.kairos_config (id) values (true) on conflict (id) do nothing;

-- Không ai đọc được qua API ngoài server (service_role luôn vượt qua RLS)
alter table public.kairos_config enable row level security;
revoke all on public.kairos_config from anon, authenticated;

-- ---------- 2. Ràng buộc nhỏ cho các bảng thông báo ----------
alter table public.push_subscriptions drop constraint if exists push_subscriptions_len;
alter table public.push_subscriptions add constraint push_subscriptions_len
  check (char_length(endpoint) <= 1000 and char_length(p256dh) <= 200 and char_length(auth) <= 100 and char_length(user_agent) <= 300);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists notifications_created_idx on public.notifications (created_at);

-- ---------- 3. Nhịp 15 phút: pg_cron gọi Edge Function "tick" ----------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Đặt cùng tên thì lịch cũ được thay bằng lịch mới (không bị nhân đôi)
select cron.schedule(
  'kairos-tick',
  '*/15 * * * *',
  $cron$
    select net.http_post(
      url := c.base_url || '/functions/v1/tick',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-kairos-tick', c.tick_secret),
      body := '{"source":"cron"}'::jsonb,
      timeout_milliseconds := 30000
    )
    from public.kairos_config c
    where c.base_url is not null;
  $cron$
);

-- Dọn lịch sử chạy của cron và pg_net cho gọn (giữ 3 ngày gần nhất), mỗi ngày một lần lúc 3h sáng giờ Việt Nam
select cron.schedule(
  'kairos-cleanup',
  '0 20 * * *',
  $cron$
    delete from cron.job_run_details where end_time < now() - interval '3 days';
    delete from public.notifications where created_at < now() - interval '45 days';
  $cron$
);

-- Báo cho API của Supabase biết có bảng mới
notify pgrst, 'reload schema';
