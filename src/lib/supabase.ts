// Kết nối Supabase. Hai giá trị bên dưới lấy từ file .env.local (hoặc biến môi trường trên Vercel).
// Nếu chưa cấu hình, app vẫn chạy được ở chế độ "Xem thử với dữ liệu mẫu".

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

export const supabase: SupabaseClient | null =
  url && key && !url.includes('xxxxxxxx') ? createClient(url, key) : null;

export const isSupabaseConfigured = supabase !== null;

/** Đổi thông báo lỗi đăng nhập của Supabase sang tiếng Việt dễ hiểu */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu chưa đúng.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Email này đã có tài khoản. Bạn hãy chuyển sang "Đăng nhập".';
  if (m.includes('password should be') || m.includes('weak password')) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (m.includes('email not confirmed')) return 'Bạn cần bấm vào đường link xác nhận trong email trước khi đăng nhập.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Bạn thử quá nhiều lần. Chờ vài phút rồi thử lại nhé.';
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('is invalid'))
    return 'Địa chỉ email chưa hợp lệ.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được. Kiểm tra mạng rồi thử lại.';
  if (m.includes('provider is not enabled')) return 'Đăng nhập Google chưa được bật trong Supabase.';
  return 'Có lỗi xảy ra: ' + message;
}
