-- ============================================================
-- KAIROS · Giai đoạn 3: Khu vườn kỷ niệm + nhìn lại tuần
-- Cách dùng: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy lại nhiều lần cũng không sao, dữ liệu cũ không mất.
--
-- Bảng journals (nhật ký ngày) và weekly_reviews (nhìn lại tuần) đã có từ 001_init.sql.
-- File này chỉ thêm vài cột:
--   - goals.final_*: "chụp" lại cây lúc kết thúc chu kỳ để Khu vườn kỷ niệm luôn hiện đúng.
--   - weekly_reviews.wins / lessons / next_focus: phần tự nhìn lại của người dùng.
-- ============================================================

alter table public.goals
  add column if not exists final_stage  smallint check (final_stage between 0 and 4),
  add column if not exists final_earned integer,
  add column if not exists final_total  integer;

alter table public.weekly_reviews
  add column if not exists wins        text not null default '',
  add column if not exists lessons     text not null default '',
  add column if not exists next_focus  text not null default '',
  add column if not exists updated_at  timestamptz not null default now();

-- Giới hạn độ dài để không ai lưu được văn bản quá lớn
alter table public.journals drop constraint if exists journals_text_len;
alter table public.journals add constraint journals_text_len
  check (char_length(did) <= 4000 and char_length(improve) <= 4000);

alter table public.weekly_reviews drop constraint if exists weekly_reviews_text_len;
alter table public.weekly_reviews add constraint weekly_reviews_text_len
  check (char_length(wins) <= 4000 and char_length(lessons) <= 4000 and char_length(next_focus) <= 4000);

create index if not exists journals_user_date_idx on public.journals (user_id, date);
create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_start);

-- Báo cho API của Supabase biết có cột mới (để app dùng được ngay, không phải chờ)
notify pgrst, 'reload schema';
