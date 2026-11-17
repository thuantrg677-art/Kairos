-- ============================================================
-- KAIROS · Giai đoạn 2a: đếm lượt dùng AI
-- Cách dùng: Supabase → SQL Editor → New query → dán TOÀN BỘ file này → Run.
-- Chạy lại nhiều lần cũng không sao.
--
-- Bảng ai_usage đã có từ 001_init.sql. File này thêm một hàm để Edge Function "ai"
-- cộng/trừ lượt một cách an toàn (hai yêu cầu cùng lúc cũng không đếm sai).
-- Chỉ server (service_role) gọi được hàm này; người dùng thường không gọi được.
-- ============================================================

create or replace function public.ai_take_call(p_user uuid, p_day date, p_limit integer, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls integer;
begin
  if p_delta > 0 then
    -- Lấy lượt: chỉ cộng khi chưa vượt giới hạn. Trả về -1 nếu đã hết lượt.
    insert into public.ai_usage as u (user_id, day, calls)
    values (p_user, p_day, p_delta)
    on conflict (user_id, day) do update
      set calls = u.calls + p_delta
      where u.calls + p_delta <= p_limit
    returning calls into v_calls;
    if v_calls is null then
      return -1;
    end if;
    return v_calls;
  end if;

  -- Trả lại lượt (khi AI lỗi, không tính lượt đó)
  update public.ai_usage
     set calls = greatest(0, calls + p_delta)
   where user_id = p_user and day = p_day
  returning calls into v_calls;
  return coalesce(v_calls, 0);
end;
$$;

revoke all on function public.ai_take_call(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_take_call(uuid, date, integer, integer) to service_role;

-- Dọn bớt dữ liệu đếm lượt cũ hơn 60 ngày (không bắt buộc, chạy khi nào cũng được)
delete from public.ai_usage where day < current_date - 60;
