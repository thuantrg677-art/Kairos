# Kairos · Kế hoạch và ghi chú để làm tiếp

File này để bất kỳ ai (hoặc một phiên chat mới với Claude) đọc xong là làm tiếp được ngay, không cần đọc lại lịch sử.

## Hiện trạng
- **GĐ1 xong** (17/11/2026): đăng nhập, onboarding 4 bước, đầu việc, lịch cố định, Hôm nay, Nháp, 6 theme sáng/tối, PWA. Vườn và Tổng quan có bản xem trước; Focus là trang giữ chỗ.
- **GĐ2a xong về code** (17/11/2026): Edge Function `ai` + 6 nút AI. Chủ dự án cần làm theo `docs/HUONG-DAN-GD2A.md` (SQL 002, khóa Gemini, tạo function) thì AI mới chạy. Chưa làm thì các nút AI báo "AI chưa được bật", app vẫn dùng bình thường.
- **GĐ2b xong** (17/11/2026): trang Focus đầy đủ (đồng hồ, giờ nghỉ, mầm cây lớn dần, âm thanh nền, nhắc khi rời app, thống kê). Không cần chạy thêm SQL: bảng `focus_sessions` đã có từ 001.
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
- Focus: chỉ ghi phiên tập trung (không ghi giờ nghỉ), phiên dưới 1 phút không ghi. Dừng sớm vẫn ghi phần đã làm (`completed = false`). Rời app thì đồng hồ vẫn chạy, chỉ nhắc và đếm số lần rời. Cây trong Focus là loài cây của mục tiêu gắn với việc (không gắn thì cây tán tròn), lớn theo % thời gian và nở hoa khi hết giờ. Tỉ lệ 20/80 tính theo nhãn hiện tại của việc.

## Cách code được tổ chức
- AI: server ở `supabase/functions/ai/index.ts` (một file, dán thẳng vào trình soạn của Supabase; import dùng `npm:`). Mỗi tác vụ là một hàm trong `ACTIONS`: `suggest_tasks`, `label`, `phrase`, `align`, `inbox`, `schedule`, cùng `status` (không tốn lượt). `buildContext()` tóm tắt dữ liệu người dùng với mã ngắn V1/G1; câu trả lời của Gemini luôn đi qua bước làm sạch (kiểu, giới hạn độ dài, mã tồn tại, giờ nằm trong khung trống). Đếm lượt bằng hàm SQL `ai_take_call` (002_ai.sql), lỗi thì trả lượt.
- AI phía app: `src/lib/ai.ts` (`askAI`, hook `useAI`, `useAIQuota`, `checkAI`), giao diện dùng chung ở `src/components/AI.tsx`. Thêm tác vụ mới: thêm hàm vào `ACTIONS` ở server và kiểu kết quả vào `AIResults`.
- Dữ liệu: `useStore` / `useData` trong `src/lib/store.ts`. Ghi bằng `insert(table, row)`, `update(table, id, patch)`, `remove(table, id)`; tên trường trùng tên cột.
- Thêm bảng mới vào app: khai báo trong `src/lib/types.ts` (`Tables`, `TABLE_NAMES`) và `EMPTY` trong `store.ts`.
- Focus: đồng hồ ở `src/lib/focus.ts` (zustand, lưu localStorage `kairos-focus-v1`, tính theo mốc thời gian nên chạy tiếp khi chuyển màn/đóng app). Phiên xong được đưa vào hàng chờ `pending` rồi ghi khi app sẵn sàng và có mạng. Nhắc rời app dùng `visibilitychange` + Notification (service worker có `notificationclick` mở lại app). `src/lib/sound.ts`: 5 âm nền tạo bằng Web Audio (không có file âm thanh), hệ số `LEVEL` để các âm to ngang nhau, chuông hết giờ `chime()`. Thống kê ở `src/lib/focusStats.ts` + `src/components/FocusStats.tsx`; `FocusPill` hiện đồng hồ ở các màn khác.
- Màn hình ở `src/pages/`, đăng ký đường dẫn trong `src/App.tsx`, tab trong `src/components/AppShell.tsx`.
- Màu: chỉ dùng biến theme (`bg-surface`, `text-ink`, `var(--k-…)`), không viết mã màu cứng.
- Luật CSS riêng phải nằm trong `@layer` (nếu không sẽ đè class Tailwind).

## Việc còn lại (mỗi phần kết thúc bằng một lần push chạy được)
- ~~**GĐ2a · AI:**~~ (xong, xem trên) Edge Function `ai` (context builder dùng chung, trả JSON có kiểm tra, đếm lượt trong `ai_usage`); nút "AI gợi ý đầu việc", gắn nhãn 20/80 kèm lý do, "AI giúp diễn đạt", nhận xét liên kết mục tiêu, gợi ý xếp Nháp, AI xếp lịch Hôm nay.
- ~~**GĐ2b · Focus:**~~ (xong) đồng hồ 25/50/90/tự đặt + nghỉ, mầm cây lớn dần, nhắc khi rời app, âm thanh Web Audio (mưa, gió, chim, quán cà phê, ồn trắng; trộn và chỉnh âm lượng), ghi `focus_sessions`, biểu đồ theo ngày/tuần/mục tiêu và tỉ lệ 20% so với 80%.
- **GĐ3:** Vườn đầy đủ (hiệu ứng chuyển giai đoạn, héo 3/7 ngày và hồi phục, Khu vườn kỷ niệm), nhật ký ngày, nhìn lại tuần + AI nhận xét, lịch sử dạng lịch.
- **GĐ4:** Web Push (VAPID) + chuông trong app, Edge Function `tick` chạy bằng cron 15 phút (tóm tắt sáng, nhắc nhật ký, deadline 7/3/1 ngày), cài đặt giờ nhắc, Tổng quan đầy đủ, kiểm thử trên điện thoại.

## Việc chủ dự án phải tự làm ở mỗi giai đoạn
- GĐ2a: làm theo `docs/HUONG-DAN-GD2A.md` (chạy 002_ai.sql, lấy khóa Gemini, dán vào Secrets, tạo function `ai`, tắt Verify JWT). Khoảng 10–15 phút.
- GĐ2b, GĐ3: không phải làm gì ngoài dùng thử (có thể chạy thêm một file SQL nhỏ).
- GĐ4: tạo cặp khóa VAPID, dán vào Secrets, chạy một câu SQL bật cron. Khoảng 15 phút.
