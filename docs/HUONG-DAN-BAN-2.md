# Kairos · Hướng dẫn cập nhật bản 2

Khoảng **10 phút**, làm hoàn toàn trong trình duyệt. Code giao diện tự lên Vercel khi gộp vào nhánh `main`; bạn chỉ cần làm 2 việc ở Supabase (và 1 việc tùy chọn).

> **Thứ tự quan trọng:** làm Bước 1 và Bước 2 **trước** (hoặc ngay sau) khi đưa bản 2 lên `main`. Chưa chạy SQL thì app vẫn mở được, nhưng tab Trợ lý, việc mỗi ngày, 5 loài cây mới và phần đánh giá phiên Focus sẽ chưa dùng được (app có dòng nhắc).

## Bản 2 có gì mới

| Ở đâu | Thay đổi |
|---|---|
| **Người mới** | Bỏ hướng dẫn sử dụng và bước tự điền mục tiêu dài hạn. Vừa vào app là **trò chuyện với Trợ lý AI**: hỏi mục tiêu 3–5 năm → hỏi bối cảnh sống, học, làm việc, số liệu hiện tại → đề xuất kế hoạch 12 tuần (mục tiêu dài hạn, mục tiêu 12 tuần, đầu việc 20/80, lịch cố định). Chọn rồi bấm thêm là xong. AI không dùng được thì có lối **Tự điền** (các bước cũ). |
| **Tab Trợ lý** (mới) | Trò chuyện bất cứ lúc nào: phân việc 80/20, chia nhỏ một việc, giữ lộ trình. AI luôn biết mục tiêu, đầu việc, lịch cố định, lịch 7 ngày tới, tiến độ cây, nhật ký và phiên Focus gần đây, cùng **những điều AI ghi nhớ** về bối cảnh của bạn (xem/xóa ở nút 🧠). Gửi kèm **ảnh** được (thời khóa biểu, đề bài…). AI đề xuất thì bạn chọn rồi mới thêm vào kế hoạch. |
| **Focus** | Thành **nghi thức**, không tính điểm, không tưới cây: "Phiên này bạn làm gì?" → "Có muốn AI gợi ý các bước không?" → Bắt đầu / Dừng (đồng hồ đếm lên) → "Bạn học có hiệu quả không?". Bỏ hẹn giờ 25/50/90, giờ nghỉ, mầm cây lớn theo giờ. |
| **Mục tiêu** | 4 tầng: **Mục tiêu dài hạn → Mục tiêu ngắn hạn (12 tuần) → Đầu việc → Việc mỗi ngày**. Mỗi đầu việc có danh sách việc mỗi ngày, nút **AI chia nhỏ**. |
| **Tưới cây** | Việc nhỏ cỡ nào cũng có thưởng: việc mỗi ngày của Việc 20% **+2 💧**, của Việc 80% **+1 💧** (đầu việc vẫn +3/+1). Tick xong có lời khen và cho biết **còn mấy 💧 nữa cây lên giai đoạn mới**. Màn Hôm nay có **Bình tưới hôm nay** (đầy khi làm hết việc trong ngày) và **chuỗi ngày tưới cây**. Vườn hiện "+N 💧 hôm nay" và giọt nước lấp lánh khi cây vừa được tưới. |
| **Vườn** | Thêm 5 loài: **cây lá kim, xương rồng, hướng dương, hoa đồng tiền, hoa hồng**. |
| **Cài đặt** | Thay Hướng dẫn sử dụng bằng một mục duy nhất: **Nguyên lý Pareto 80/20** (giới thiệu và cách tư duy). |

---

## Bước 1. Chạy file SQL mới (1 phút)

1. Mở file [`supabase/migrations/005_v2.sql`](../supabase/migrations/005_v2.sql) trên GitHub → bấm **Copy raw file**.
2. Supabase → **SQL Editor** → **New query** → dán → **Run**.
3. Thấy `Success` là được. File này chỉ thêm bảng/cột mới, không đụng tới dữ liệu cũ, chạy lại nhiều lần cũng không sao.

File này thêm: bảng `chat_messages` (có Row Level Security), cột `profiles.ai_context`, cột `tasks.parent_id`, 4 cột cho `focus_sessions`, cho phép 5 loài cây mới, và hàm `ai_take_chat` đếm lượt trò chuyện.

## Bước 2. Cập nhật Edge Function `ai` (3 phút)

1. Mở file [`supabase/functions/ai/index.ts`](../supabase/functions/ai/index.ts) trên GitHub → **Copy raw file**.
2. Supabase → **Edge Functions** → bấm vào function **`ai`** → tab **Code**.
3. Xóa hết code cũ, dán code vừa chép → **Deploy**. Chờ khoảng 30 giây.
4. Không cần đổi Secrets. **Verify JWT** vẫn để **tắt** như cũ.

Tùy chọn: thêm Secret `CHAT_DAILY_LIMIT` để đổi số tin nhắn trò chuyện mỗi người mỗi ngày (mặc định **40**, tính riêng với 15 lượt của các nút AI). Với 20 người dùng thử, phần trò chuyện dùng tối đa 20 × 40 = 800 lượt gọi Gemini mỗi ngày: hãy đối chiếu với hạn mức của khóa trong Google AI Studio (mục Rate limits) và hạ con số này nếu cần.

## Bước 3 (nên làm). Cập nhật Edge Function `tick` (2 phút)

Để tóm tắt buổi sáng đếm đúng "việc mỗi ngày" (chỉ tính vào đúng ngày định làm):

1. Mở file [`supabase/functions/tick/index.ts`](../supabase/functions/tick/index.ts) → **Copy raw file**.
2. Supabase → **Edge Functions** → **`tick`** → tab **Code** → xóa code cũ, dán → **Deploy**.

Không làm bước này thì thông báo vẫn chạy, chỉ là tóm tắt sáng có thể đếm cả việc nhỏ của ngày mai.

## Bước 4. Kiểm tra (3 phút)

1. Mở app, tải lại trang (hoặc bấm **Tải lại** khi có dải "Có bản cập nhật mới"). Cuối trang **Cài đặt** ghi "bản 2".
2. Mở tab **Trợ lý** → gõ "Hôm nay mình nên làm gì trước?". Có câu trả lời nhắc đúng việc của bạn là Bước 1 và 2 đã xong.
3. **Mục tiêu** → mở một mục tiêu → bấm "Chia thành việc mỗi ngày" ở một đầu việc → **AI chia nhỏ** → thêm vài việc. Ra **Hôm nay** tick một việc nhỏ: thấy giọt nước, lời khen và bình tưới đầy thêm.
4. **Focus** → viết điều định làm → "Có, gợi ý giúp mình" → **Bắt đầu focus** → sau hơn 1 phút bấm **Dừng** → chọn mức hiệu quả → **Lưu phiên**.
5. Muốn thử phần làm quen của người mới: tạo một tài khoản mới (email khác) rồi đăng nhập.

Xem nhanh không cần tài khoản: chế độ **Xem thử** có sẵn việc mỗi ngày, cuộc trò chuyện mẫu, cây mới. Đã mở chế độ xem thử từ trước thì vào **Cài đặt → Nạp lại dữ liệu mẫu**. (Chế độ xem thử không gọi được AI.)

---

## Về dữ liệu và quyền riêng tư

- Tin nhắn với Trợ lý nằm ở bảng `chat_messages`, có Row Level Security: chỉ chính người đó đọc được qua app. Ảnh gửi kèm được thu nhỏ trên máy; chỉ ảnh rất nhỏ (để hiện lại trong cuộc trò chuyện) được lưu, ảnh gửi cho AI không được lưu.
- Mỗi tin nhắn, server gửi cho Gemini: mục tiêu, đầu việc, lịch cố định, lịch 7 ngày tới, tiến độ cây, nhật ký 4 ngày gần nhất, phiên Focus 7 ngày gần nhất, những điều AI ghi nhớ và 24 tin nhắn gần nhất. Không gửi email hay tên tài khoản (chỉ tên hiển thị).
- "Những điều AI ghi nhớ" nằm ở `profiles.ai_context`. Người dùng xem, xóa từng điều hoặc tự thêm ở tab Trợ lý → nút 🧠. AI được dặn không ghi nhớ số giấy tờ, tài khoản hay chuyện sức khỏe, nhạy cảm.
