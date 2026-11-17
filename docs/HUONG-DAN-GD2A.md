# Kairos · Hướng dẫn bật AI (giai đoạn 2a)

Khoảng **10–15 phút**, làm hoàn toàn trong trình duyệt. Code giao diện đã tự lên Vercel; bạn chỉ cần bật phần server cho AI.

Sau khi xong, các nút ✨ trong app sẽ hoạt động:

| Ở đâu | Nút | AI làm gì |
|---|---|---|
| Khởi đầu bước 1, sửa mục tiêu dài hạn | **AI giúp diễn đạt** | Viết lại mục tiêu dài hạn thành 3 phương án rõ ràng hơn |
| Thêm/sửa mục tiêu 12 tuần | **AI giúp diễn đạt** | 3 phương án kiểu SMART, kèm cách đo |
| Thêm/sửa mục tiêu 12 tuần | **AI nhận xét mức liên kết** | Chấm 1–5 mức nối với mục tiêu dài hạn, góp ý cách sửa |
| Mục tiêu → mở một mục tiêu | **AI gợi ý đầu việc** | 4–6 việc mới, đã gắn nhãn 20/80 và lý do; chọn việc muốn thêm |
| Thêm/sửa đầu việc | **AI gợi ý nhãn** | Xếp việc là Việc 20% hay 80%, kèm lý do |
| Nháp | **AI gợi ý cách xếp** | Mục nào nên thành việc, thuộc mục tiêu nào, hạn ra sao; mục nào chỉ là ghi chú |
| Hôm nay → Dòng thời gian | **AI xếp lịch** | Xếp việc vào khung trống theo độ ưu tiên, hạn chót và lúc tỉnh táo |

Mỗi người có **15 lượt/ngày**. Lượt nào AI lỗi thì không bị tính. Hết lượt, chưa bật AI hoặc đang ở chế độ xem thử thì nút **AI xếp lịch** tự chuyển sang cách xếp theo quy tắc.

---

## Bước 1. Chạy file SQL mới (1 phút)

1. Mở file [`supabase/migrations/002_ai.sql`](../supabase/migrations/002_ai.sql) trên GitHub → bấm **Copy raw file**.
2. Supabase → **SQL Editor** → **New query** → dán → **Run**.
3. Thấy `Success` là được. File này chỉ thêm một hàm đếm lượt AI, không đụng tới dữ liệu cũ.

## Bước 2. Lấy khóa Gemini (3 phút)

1. Vào **aistudio.google.com** → đăng nhập Gmail của dự án.
2. Bấm **Get API key** (menu trái hoặc góc trên) → **Create API key**.
   - Nếu được hỏi chọn project: chọn project `Kairos` đã tạo ở giai đoạn 1 (bước Google Cloud), hoặc để Google tạo project mới đều được.
3. Chép khóa (dạng `AIza…`). **Không dán khóa này vào GitHub, Vercel hay gửi qua chat nhóm.**

Gói miễn phí không cần thẻ. Google giới hạn số lần gọi mỗi phút và mỗi ngày; với ~20 người dùng thử thì thường đủ.

## Bước 3. Dán khóa vào Supabase (1 phút)

Supabase → menu trái **Edge Functions** → **Secrets** (hoặc **Manage secrets**) → thêm:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | khóa ở Bước 2 |

→ **Save**.

Không bắt buộc, chỉ thêm khi cần:

| Name | Khi nào dùng |
|---|---|
| `GEMINI_MODEL` | Muốn đổi model. Mặc định `gemini-3.5-flash-lite`. |
| `AI_DAILY_LIMIT` | Muốn đổi số lượt mỗi người mỗi ngày. Mặc định `15`. |

## Bước 4. Tạo Edge Function `ai` (5 phút)

1. Mở file [`supabase/functions/ai/index.ts`](../supabase/functions/ai/index.ts) trên GitHub → **Copy raw file**.
2. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
3. Đặt tên function đúng là **`ai`** (chữ thường).
4. Xóa hết code mẫu trong khung soạn thảo, dán code vừa chép → **Deploy function**. Chờ khoảng 30 giây.
5. Mở function `ai` vừa tạo → tab **Details** (hoặc **Settings**) → tìm mục **Verify JWT** / **Enforce JWT verification** → **tắt** → **Save**.
   - Function đã tự kiểm tra đăng nhập bên trong, nên tắt mục này để tránh lỗi 401 với kiểu khóa mới của Supabase. Người chưa đăng nhập vẫn bị chặn.

Lần sau khi code AI được cập nhật, hướng dẫn sẽ nhắc. Cách cập nhật: mở function `ai` → tab **Code** → dán code mới → **Deploy**.

## Bước 5. Kiểm tra

Mở app (đã đăng nhập) và tick từng dòng:

- [ ] **Cài đặt** → mục **Trợ lý AI** hiện "✨ AI đang bật. Hôm nay bạn còn 15/15 lượt."
- [ ] **Mục tiêu** → mở một mục tiêu → **AI gợi ý đầu việc** → thấy 4–6 việc, bỏ chọn bớt rồi **Thêm**.
- [ ] Thêm một đầu việc mới, gõ tên → **AI gợi ý nhãn** → nhãn 20%/80% và lý do tự điền.
- [ ] Sửa một mục tiêu 12 tuần → **AI nhận xét mức liên kết** → thấy điểm 1–5 và góp ý.
- [ ] Ghi 2–3 dòng vào **Nháp** (ví dụ "nộp báo cáo thứ 6") → **AI gợi ý cách xếp** → **Dùng gợi ý** → bảng thêm việc đã điền sẵn.
- [ ] **Hôm nay** → **AI xếp lịch** → các việc hiện trên dòng thời gian, kèm một dòng 💡 giải thích.
- [ ] Supabase → **Table Editor** → bảng `ai_usage`: thấy một dòng với số lượt đã dùng hôm nay.

---

## Lỗi thường gặp

| App báo | Nguyên nhân và cách sửa |
|---|---|
| "AI chưa được bật: chưa tạo Edge Function ai" | Chưa làm Bước 4, hoặc đặt tên function khác `ai`. |
| "Phiên đăng nhập đã hết hạn" ngay cả khi vừa đăng nhập | Chưa tắt **Verify JWT** ở Bước 4 mục 5. |
| "AI chưa được bật: chủ app cần thêm GEMINI_API_KEY" | Chưa làm Bước 3, hoặc gõ sai tên secret. Sửa xong không cần deploy lại. |
| "Khóa Gemini chưa đúng" | Khóa chép thiếu ký tự, hoặc khóa đã bị xóa trong AI Studio. Tạo khóa mới, dán lại ở Bước 3. |
| "Không tìm thấy model …" | `GEMINI_MODEL` gõ sai. Xóa secret này để dùng model mặc định. |
| "Chưa chạy file SQL 002_ai.sql" | Làm Bước 1. |
| "AI đang quá tải…" | Hết lượt miễn phí của Google trong phút đó. Chờ 1–2 phút. |
| "Bạn đã dùng hết 15 lượt AI hôm nay" | Đúng thiết kế. Sang ngày mới (theo giờ Việt Nam) là có lượt mới. |

Xem lỗi chi tiết: Supabase → **Edge Functions** → `ai` → tab **Logs**.

## Về dữ liệu gửi cho AI

- Mỗi lần bấm nút AI, server gửi cho Gemini bản tóm tắt: mục tiêu dài hạn, mục tiêu 12 tuần, tên các đầu việc, lịch cố định (khi cần) và nội dung đang hỏi (ví dụ các dòng trong Nháp). **Không gửi email hay tên tài khoản.** Nhật ký chỉ được gửi khi bấm **AI nhận xét tuần** (giai đoạn 3), và chỉ nhật ký của tuần đó.
- Với gói miễn phí, Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm của họ. Nên nói rõ điều này với người dùng thử, và nhắc họ không ghi thông tin nhạy cảm vào Nháp khi dùng AI.
