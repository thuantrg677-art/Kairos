# Kairos · Kế hoạch và ghi chú để làm tiếp

File này để bất kỳ ai (hoặc một phiên chat mới với Claude) đọc xong là làm tiếp được ngay, không cần đọc lại lịch sử.

## Hiện trạng
- **GĐ1 xong** (17/11/2026): đăng nhập, onboarding 4 bước, đầu việc, lịch cố định, Hôm nay, Nháp, 6 theme sáng/tối, PWA. Vườn và Tổng quan có bản xem trước; Focus là trang giữ chỗ.
- **GĐ2a xong về code** (17/11/2026): Edge Function `ai` + 6 nút AI. Chủ dự án cần làm theo `docs/HUONG-DAN-GD2A.md` (SQL 002, khóa Gemini, tạo function) thì AI mới chạy. Chưa làm thì các nút AI báo "AI chưa được bật", app vẫn dùng bình thường.
- **GĐ2b xong** (17/11/2026): trang Focus đầy đủ (đồng hồ, giờ nghỉ, mầm cây lớn dần, âm thanh nền, nhắc khi rời app, thống kê). Không cần chạy thêm SQL: bảng `focus_sessions` đã có từ 001.
- **GĐ3 xong về code** (17/11/2026): Vườn đầy đủ (héo/hồi phục, hiệu ứng lên giai đoạn, Khu vườn kỷ niệm, kết thúc chu kỳ), nhật ký ngày, nhìn lại tuần + AI nhận xét tuần, lịch sử dạng lịch. Chủ dự án cần làm theo `docs/HUONG-DAN-GD3.md` (chạy SQL 003, dán lại code function `ai`). Chưa làm thì app vẫn chạy: ô "Tự nhìn lại" bị khóa có dòng nhắc, nút AI nhận xét tuần báo lỗi tác vụ không tồn tại.
- **GĐ4 xong về code** (17/11/2026): Web Push + chuông trong app, Edge Function `tick` (cron 15 phút: tóm tắt sáng, nhắc deadline 7/3/1 ngày, nhắc nhật ký), Cài đặt → Thông báo (bật/tắt/gửi thử, giờ nhắc), Tổng quan đầy đủ (con số chính, deadline sắp tới, giờ focus, chi tiết từng mục tiêu). Chủ dự án cần làm theo `docs/HUONG-DAN-GD4.md` (chạy SQL 004, tạo function `tick`, tắt Verify JWT). Chưa làm thì app vẫn chạy: Cài đặt báo "Máy chủ thông báo chưa được bật", chuông chỉ trống.
- Repo: `thuantrg677-art/Kairos` (Public, nhánh `main`, Vercel tự deploy). Mọi dịch vụ dùng chung một Gmail của chủ dự án.
- Database: `supabase/migrations/001_init.sql` đã có sẵn bảng cho GĐ2–4 (`focus_sessions`, `ai_usage`, `journals`, `weekly_reviews`, `push_subscriptions`, `notifications`). `003_gd3.sql` thêm `goals.final_stage/final_earned/final_total` và `weekly_reviews.wins/lessons/next_focus/updated_at`. `004_gd4.sql` thêm bảng `kairos_config` (1 dòng, chỉ server đọc), bật pg_cron + pg_net, hẹn job `kairos-tick` (*/15) và `kairos-cleanup` (xóa thông báo > 45 ngày).

## Quyết định đã chốt
- Theme mặc định **Tán rừng**; đăng ký mở (Google + email), không mã mời.
- Offline chỉ xem; mọi thao tác ghi cần mạng.
- Việc 20% = 3 💧, việc 80% = 1 💧. Cây lớn = 💧 đã nhận ÷ tổng 💧 cả chu kỳ; ngưỡng giai đoạn 3% / 20% / 45% / 75% (`src/lib/logic.ts`).
- Điểm tuần = lượt đã tick ÷ lượt theo kế hoạch (việc lặp lại tính từng lượt; việc một lần tính khi có hạn trong tuần, đã xếp vào một ngày, hoặc đã xong).
- Chu kỳ 12 tuần bắt đầu thứ Hai. Giờ lấy theo thiết bị.
- AI: `gemini-3.5-flash-lite` qua biến `GEMINI_MODEL`, 15 lượt/người/ngày, khóa chỉ nằm ở Supabase Edge Function. Hết lượt thì dùng `autoArrange` (quy tắc) trong `logic.ts`.
- Tóm tắt sáng và nhắc deadline làm bằng quy tắc, không dùng AI.
- Focus: chỉ ghi phiên tập trung (không ghi giờ nghỉ), phiên dưới 1 phút không ghi. Dừng sớm vẫn ghi phần đã làm (`completed = false`). Rời app thì đồng hồ vẫn chạy, chỉ nhắc và đếm số lần rời. Cây trong Focus là loài cây của mục tiêu gắn với việc (không gắn thì cây tán tròn), lớn theo % thời gian và nở hoa khi hết giờ. Tỉ lệ 20/80 tính theo nhãn hiện tại của việc.

- Vườn (GĐ3): héo tính theo số ngày trọn vẹn liền không tưới (không tính hôm nay; ngày tạo mục tiêu/đầu chu kỳ coi như một lần tưới): ≥3 ngày hơi héo, ≥7 ngày héo rõ. Tick một việc là tươi lại ngay. Héo chỉ là hình ảnh (bạc màu, rũ, lá rụng), không trừ 💧, không đổi giai đoạn.
- Kết thúc chu kỳ: các mục tiêu của chu kỳ → `status = 'done'` kèm ảnh chụp `final_*`; chu kỳ → `done`; tạo chu kỳ mới bắt đầu thứ Hai tuần này. Kết thúc sớm thì `end_date` ghi là hôm nay nhưng cây giữ đúng giai đoạn đang thấy (tính trên cả 12 tuần). Mục tiêu dài hạn giữ nguyên.
- Nhật ký: một dòng/ngày (năng lượng 1–5, "đã làm được gì", "ngày mai làm tốt hơn điều gì"). AI chỉ đọc nhật ký khi bấm "AI nhận xét tuần", và chỉ của tuần đó.
- Nhìn lại tuần: mặc định T7/CN xem tuần này, ngày khác xem tuần trước. Thẻ nhắc ở Hôm nay hiện T7, CN (tuần này) và T2, T3 (tuần trước) khi tuần đó chưa có nhìn lại. Cách đếm giống điểm thực thi tuần.
- Thông báo (GĐ4): server tạo dòng trong `notifications` (chuông) rồi gửi Web Push tới mọi thiết bị của người đó. `dedupe_key` (unique theo user) chống nhắc trùng: `morning:<ngày>`, `journal:<ngày>`, `deadline:<task>:<hạn>:<7|3|1>`, `test:<phút>`. Nhắc được gửi trong 3 tiếng kể từ giờ đã chọn, không qua nửa đêm. Giờ theo `profiles.timezone`, app tự ghi múi giờ của thiết bị mỗi lần mở.
- Cài đặt nhắc nằm ở `profiles.settings.notify` (`NOTIFY_DEFAULTS` trong `types.ts`): tóm tắt sáng 07:00, nhắc nhật ký 21:30, deadline bật; deadline gửi cùng khung giờ sáng. Chỉ việc một lần có `important = true` và có hạn mới được nhắc deadline. Tối Chủ nhật, nếu tuần chưa nhìn lại thì nhắc nhật ký kèm nhìn lại tuần (mở `/tong-quan/tuan`).
- Khóa VAPID: function tự tạo ở lần đầu và lưu trong `kairos_config` (Secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` nếu có thì được ưu tiên). App lấy khóa công khai qua `tick` (action `config`), không cần biến môi trường trên Vercel. Subject của VAPID là địa chỉ app (ghi lần đầu app gọi tới) hoặc `VAPID_SUBJECT`.
- Cron gọi `tick` kèm header `x-kairos-tick` = `kairos_config.tick_secret` (tạo ngẫu nhiên trong SQL). Địa chỉ project `kairos_config.base_url` do function tự ghi khi được gọi lần đầu (mở Cài đặt → Thông báo, hoặc mở URL function bằng trình duyệt).
- Đăng xuất thì hủy đăng ký push trên thiết bị đó (server tự xóa dòng ở lần gửi sau nhờ mã 404/410). Một thiết bị đổi tài khoản thì dòng `push_subscriptions` được chuyển sang tài khoản mới (upsert theo `endpoint`).
- Lịch sử: độ đậm ô theo 💧 so với "ngày rất tốt" (phân vị 80% các ngày có làm việc). Tháng cũ hơn 100 ngày được tải riêng bằng `loadRange`.

## Cách code được tổ chức
- AI: server ở `supabase/functions/ai/index.ts` (một file, dán thẳng vào trình soạn của Supabase; import dùng `npm:`). Mỗi tác vụ là một hàm trong `ACTIONS`: `suggest_tasks`, `label`, `phrase`, `align`, `inbox`, `schedule`, cùng `status` (không tốn lượt). `buildContext()` tóm tắt dữ liệu người dùng với mã ngắn V1/G1; câu trả lời của Gemini luôn đi qua bước làm sạch (kiểu, giới hạn độ dài, mã tồn tại, giờ nằm trong khung trống). Đếm lượt bằng hàm SQL `ai_take_call` (002_ai.sql), lỗi thì trả lượt.
- AI phía app: `src/lib/ai.ts` (`askAI`, hook `useAI`, `useAIQuota`, `checkAI`), giao diện dùng chung ở `src/components/AI.tsx`. Thêm tác vụ mới: thêm hàm vào `ACTIONS` ở server và kiểu kết quả vào `AIResults`.
- Dữ liệu: `useStore` / `useData` trong `src/lib/store.ts`. Ghi bằng `insert(table, row)`, `update(table, id, patch)`, `remove(table, id)`; tên trường trùng tên cột.
- Thêm bảng mới vào app: khai báo trong `src/lib/types.ts` (`Tables`, `TABLE_NAMES`) và `EMPTY` trong `store.ts`.
- Focus: đồng hồ ở `src/lib/focus.ts` (zustand, lưu localStorage `kairos-focus-v1`, tính theo mốc thời gian nên chạy tiếp khi chuyển màn/đóng app). Phiên xong được đưa vào hàng chờ `pending` rồi ghi khi app sẵn sàng và có mạng. Nhắc rời app dùng `visibilitychange` + Notification (service worker có `notificationclick` mở lại app). `src/lib/sound.ts`: 5 âm nền tạo bằng Web Audio (không có file âm thanh), hệ số `LEVEL` để các âm to ngang nhau, chuông hết giờ `chime()`. Thống kê ở `src/lib/focusStats.ts` + `src/components/FocusStats.tsx`; `FocusPill` hiện đồng hồ ở các màn khác.
- Vườn: `src/lib/garden.ts` (`goalHealth`, `livePlants`, `plantSnapshot` + `announceGrowth` gọi quanh `toggleTask` ở TaskRow và Focus, `readSeen/writeSeen/plantEvents` nhớ trạng thái cây lần ghé trước trong localStorage `kairos-garden-seen-<uid>`, `closeCycle`, `memorialPlants`). Khung cảnh vườn dùng chung: `src/components/GardenScene.tsx`; tổng kết chu kỳ: `src/components/CycleWrap.tsx`. `Plant` nhận `wilt` 0/1/2.
- Nhật ký / nhìn lại / lịch sử: số liệu ở `src/lib/review.ts` (`daySummary`, `weekReport`, `saveJournal`, `saveReview`, `monthGrid`…), giao diện `src/components/Journal.tsx` (JournalSheet, JournalCard, WeekReviewPrompt) và các trang `src/pages/WeekReview.tsx` (`/tong-quan/tuan?tuan=yyyy-mm-dd`), `JournalPage.tsx` (`/tong-quan/nhat-ky`), `History.tsx` (`/tong-quan/lich-su`). Tổng quan là trang dẫn vào ba trang này.
- AI nhận xét tuần: tác vụ `weekly_review` trong Edge Function; app gửi số liệu tuần + ba câu tự nhìn lại (kể cả chưa lưu), server tự đọc nhật ký của tuần. Kết quả lưu vào `weekly_reviews.ai_review` (kiểu `AIWeekReview`).
- `useStore().gd3` cho biết đã chạy 003 chưa (thử đọc cột mới lúc tải dữ liệu). Chưa có thì không gửi các cột mới khi ghi.
- Dữ liệu mẫu (`seed.ts`) có sẵn: một chu kỳ cũ trong Khu vườn kỷ niệm, mục tiêu đồ án bị bỏ bê 4 ngày (hơi héo), nhật ký 10 ngày, nhìn lại các tuần đã qua (tuần gần nhất có AI nhận xét mẫu).
- Thông báo: server ở `supabase/functions/tick/index.ts` (một file; Web Push tự mã hóa aes128gcm + ký VAPID bằng WebCrypto, không thư viện ngoài; chỉ gửi tới máy chủ push của Google/Apple/Mozilla/Microsoft). Ba lối vào: cron (header bí mật) → `runTick`; app đã đăng nhập → action `config` / `subscribe` / `unsubscribe` / `test`; GET bằng trình duyệt → trang tình trạng dạng chữ. Phần đếm việc trong ngày (`dayItems`) chép từ `itemsForDate` ở `logic.ts`: sửa một bên thì sửa cả bên kia.
- Thông báo phía app: `src/lib/push.ts` (`usePush`: trạng thái thiết bị, `enable/disable/test/check`), giao diện `src/components/Notifications.tsx` (`NotificationBell`, `NotificationSheet`, `NotificationSettings`). Bảng `notifications` nằm trong `TABLE_NAMES` (tải 60 dòng / 30 ngày gần nhất); app không bao giờ insert, chỉ `markRead`; `refreshNotifications` tải lại riêng chuông. Service worker (`pwa/sw.js`) xử lý `push` (hiện thông báo + nhắn `kairos-push` cho app) và `notificationclick` (app đang mở: nhắn `kairos-open`; app đóng: mở `url?tb=<id>` để đánh dấu đã đọc). `AppShell` nghe hai tin nhắn này.
- Tổng quan: số liệu ở `src/lib/overview.ts` (`upcomingDeadlines`, `focusSummary`, `goalDetail`, `dropsBetween`), trang `src/pages/Overview.tsx` (thẻ Deadline sắp tới, Giờ focus, bảng Chi tiết mục tiêu; bấm việc mở `TaskEditor`).
- Kiểm thử phía server không cần Supabase: `deno check supabase/functions/tick/index.ts`; mã hóa Web Push đã được đối chiếu bằng thư viện `http_ece` (giải mã ra đúng nội dung) và chữ ký VAPID kiểm bằng `crypto.verify` của Node.
- Màn hình ở `src/pages/`, đăng ký đường dẫn trong `src/App.tsx`, tab trong `src/components/AppShell.tsx`. Trang con dùng `SubPageHeader` (có nút quay lại).
- Màu: chỉ dùng biến theme (`bg-surface`, `text-ink`, `var(--k-…)`), không viết mã màu cứng.
- Luật CSS riêng phải nằm trong `@layer` (nếu không sẽ đè class Tailwind).

## Việc còn lại (mỗi phần kết thúc bằng một lần push chạy được)
- ~~**GĐ2a · AI:**~~ (xong, xem trên) Edge Function `ai` (context builder dùng chung, trả JSON có kiểm tra, đếm lượt trong `ai_usage`); nút "AI gợi ý đầu việc", gắn nhãn 20/80 kèm lý do, "AI giúp diễn đạt", nhận xét liên kết mục tiêu, gợi ý xếp Nháp, AI xếp lịch Hôm nay.
- ~~**GĐ2b · Focus:**~~ (xong) đồng hồ 25/50/90/tự đặt + nghỉ, mầm cây lớn dần, nhắc khi rời app, âm thanh Web Audio (mưa, gió, chim, quán cà phê, ồn trắng; trộn và chỉnh âm lượng), ghi `focus_sessions`, biểu đồ theo ngày/tuần/mục tiêu và tỉ lệ 20% so với 80%.
- ~~**GĐ3:**~~ (xong) Vườn đầy đủ (hiệu ứng chuyển giai đoạn, héo 3/7 ngày và hồi phục, Khu vườn kỷ niệm), nhật ký ngày, nhìn lại tuần + AI nhận xét, lịch sử dạng lịch.
- ~~**GĐ4:**~~ (xong về code) Web Push (VAPID) + chuông trong app, Edge Function `tick` chạy bằng cron 15 phút (tóm tắt sáng, nhắc nhật ký, deadline 7/3/1 ngày), cài đặt giờ nhắc, Tổng quan đầy đủ. Kiểm thử trên điện thoại thật: theo bảng trong `docs/HUONG-DAN-GD4.md`.
- **Sau GĐ4 (chưa làm, chờ phản hồi người dùng thử):** sửa lỗi từ đợt test trên điện thoại; tách code (bundle JS ~510 kB, có thể `import()` trang Focus/Tổng quan/Lịch sử); cân nhắc nhắc "cây đang khát" khi một mục tiêu 3 ngày chưa được tưới; đổi tên thương hiệu nếu nhóm chốt tên mới.

## Việc chủ dự án phải tự làm ở mỗi giai đoạn
- GĐ2a: làm theo `docs/HUONG-DAN-GD2A.md` (chạy 002_ai.sql, lấy khóa Gemini, dán vào Secrets, tạo function `ai`, tắt Verify JWT). Khoảng 10–15 phút.
- GĐ2b: không phải làm gì ngoài dùng thử.
- GĐ3: làm theo `docs/HUONG-DAN-GD3.md` (chạy 003_gd3.sql, dán lại code function `ai`). Khoảng 5 phút.
- GĐ4: làm theo `docs/HUONG-DAN-GD4.md` (chạy 004_gd4.sql, tạo function `tick`, tắt Verify JWT, mở URL function một lần, bật thông báo trong app). Không cần tạo khóa VAPID hay sửa SQL. Khoảng 10 phút, rồi cho nhóm kiểm thử trên điện thoại theo bảng trong hướng dẫn.
