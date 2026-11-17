# Kairos · Kế hoạch và ghi chú để làm tiếp

File này để bất kỳ ai (hoặc một phiên chat mới với Claude) đọc xong là làm tiếp được ngay, không cần đọc lại lịch sử.

## Hiện trạng
- **GĐ1 xong** (17/11/2026): đăng nhập, onboarding 4 bước, đầu việc, lịch cố định, Hôm nay, Nháp, 6 theme sáng/tối, PWA. Vườn và Tổng quan có bản xem trước; Focus là trang giữ chỗ; các nút AI đang mờ.
- Repo: `thuantrg677-art/Kairos` (Public, nhánh `main`, Vercel tự deploy). Mọi dịch vụ dùng chung một Gmail của chủ dự án.
- Database: `supabase/migrations/001_init.sql` đã có sẵn bảng cho GĐ2–4 (`focus_sessions`, `ai_usage`, `journals`, `weekly_reviews`, `push_subscriptions`, `notifications`).

## Quyết định đã chốt
- Theme mặc định **Tán rừng**; đăng ký mở (Google + email), không mã mời.
- Offline chỉ xem; mọi thao tác ghi cần mạng.
- Việc 20% = 3 💧, việc 80% = 1 💧. Cây lớn = 💧 đã nhận ÷ tổng 💧 cả chu kỳ; ngưỡng giai đoạn 3% / 20% / 45% / 75% (`src/lib/logic.ts`).
- Điểm tuần = lượt đã tick ÷ lượt theo kế hoạch (việc lặp lại tính từng lượt; việc một lần tính khi có hạn trong tuần, đã xếp vào một ngày, hoặc đã xong).
- Chu kỳ 12 tuần bắt đầu thứ Hai. Giờ lấy theo thiết bị.
- AI: `gemini-3.5-flash-lite` qua biến `GEMINI_MODEL`, 15 lượt/người/ngày, khóa chỉ nằm ở Supabase Edge Function. Hết lượt thì dùng `autoArrange` (quy tắc) trong `logic.ts`.
- Tóm tắt sáng và nhắc deadline làm bằng quy tắc, không dùng AI.

## Cách code được tổ chức
- Dữ liệu: `useStore` / `useData` trong `src/lib/store.ts`. Ghi bằng `insert(table, row)`, `update(table, id, patch)`, `remove(table, id)`; tên trường trùng tên cột.
- Thêm bảng mới vào app: khai báo trong `src/lib/types.ts` (`Tables`, `TABLE_NAMES`) và `EMPTY` trong `store.ts`.
- Màn hình ở `src/pages/`, đăng ký đường dẫn trong `src/App.tsx`, tab trong `src/components/AppShell.tsx`.
- Màu: chỉ dùng biến theme (`bg-surface`, `text-ink`, `var(--k-…)`), không viết mã màu cứng.
- Luật CSS riêng phải nằm trong `@layer` (nếu không sẽ đè class Tailwind).

## Việc còn lại (mỗi phần kết thúc bằng một lần push chạy được)
- **GĐ2a · AI:** Edge Function `ai` (context builder dùng chung, trả JSON có kiểm tra, đếm lượt trong `ai_usage`); nút "AI gợi ý đầu việc", gắn nhãn 20/80 kèm lý do, "AI giúp diễn đạt", nhận xét liên kết mục tiêu, gợi ý xếp Nháp, AI xếp lịch Hôm nay.
- **GĐ2b · Focus:** đồng hồ 25/50/90/tự đặt + nghỉ, mầm cây lớn dần, nhắc khi rời app, âm thanh Web Audio (mưa, gió, chim, quán cà phê, ồn trắng; trộn và chỉnh âm lượng), ghi `focus_sessions`, biểu đồ theo ngày/tuần/mục tiêu và tỉ lệ 20% so với 80%.
- **GĐ3:** Vườn đầy đủ (hiệu ứng chuyển giai đoạn, héo 3/7 ngày và hồi phục, Khu vườn kỷ niệm), nhật ký ngày, nhìn lại tuần + AI nhận xét, lịch sử dạng lịch.
- **GĐ4:** Web Push (VAPID) + chuông trong app, Edge Function `tick` chạy bằng cron 15 phút (tóm tắt sáng, nhắc nhật ký, deadline 7/3/1 ngày), cài đặt giờ nhắc, Tổng quan đầy đủ, kiểm thử trên điện thoại.

## Việc chủ dự án phải tự làm ở mỗi giai đoạn
- GĐ2a: lấy khóa Gemini ở Google AI Studio, dán vào Supabase (Edge Functions → Secrets), tạo function bằng cách dán một file trong trình duyệt. Khoảng 10 phút.
- GĐ2b, GĐ3: không phải làm gì ngoài dùng thử (có thể chạy thêm một file SQL nhỏ).
- GĐ4: tạo cặp khóa VAPID, dán vào Secrets, chạy một câu SQL bật cron. Khoảng 15 phút.
