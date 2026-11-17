# Kairos · Hướng dẫn giai đoạn 3

Khoảng **5 phút**, làm hoàn toàn trong trình duyệt. Code giao diện đã tự lên Vercel khi push; bạn chỉ cần làm 2 việc ở Supabase.

## Giai đoạn 3 có gì mới

| Ở đâu | Tính năng |
|---|---|
| **Vườn** | Cây **hơi héo** khi 3 ngày liền không được tưới (không tick việc nào của mục tiêu), **héo rõ** sau 7 ngày. Tick một việc là cây **tươi lại ngay**, không bao giờ chết hẳn. Thẻ "Cây đang khát" chỉ ra cây cần chăm. |
| **Vườn** | Hiệu ứng khi cây **lên giai đoạn mới** hoặc **hồi phục** (lúc tick việc có thông báo, lúc ghé Vườn có hiệu ứng lấp lánh). |
| **Vườn** | **Khu vườn kỷ niệm**: hết 12 tuần, app nhắc tổng kết; bấm lưu thì cả khu vườn được giữ nguyên ở giai đoạn cuối, rồi mở chu kỳ 12 tuần mới. Có nút "Kết thúc chu kỳ sớm" ở cuối trang Vườn. |
| **Hôm nay** | Thẻ **Nhật ký hôm nay** (năng lượng 1–5, hôm nay làm được gì, ngày mai muốn làm tốt hơn điều gì). Cuối tuần và đầu tuần có thẻ nhắc **Nhìn lại tuần**. |
| **Tổng quan → Nhìn lại tuần** | Điểm thực thi, từng ngày, từng mục tiêu, việc 20% bị bỏ lỡ, ba câu tự nhìn lại, nút **AI nhận xét tuần**. |
| **Tổng quan → Nhật ký** | Biểu đồ năng lượng 14 ngày, chuỗi ngày viết liên tiếp, các trang nhật ký. |
| **Tổng quan → Lịch sử** | Lịch theo tháng, ô càng đậm là ngày càng nhiều 💧. Bấm một ngày để xem việc đã làm, giờ focus, nhật ký. |

---

## Bước 1. Chạy file SQL mới (1 phút)

1. Mở file [`supabase/migrations/003_gd3.sql`](../supabase/migrations/003_gd3.sql) trên GitHub → bấm **Copy raw file**.
2. Supabase → **SQL Editor** → **New query** → dán → **Run**.
3. Thấy `Success` là được. File này chỉ thêm vài cột, không đụng tới dữ liệu cũ, chạy lại nhiều lần cũng không sao.

Chưa chạy file này thì app vẫn dùng bình thường, chỉ có hai chỗ bị ảnh hưởng: ô "Tự nhìn lại" trong Nhìn lại tuần bị khóa (có dòng nhắc), và Khu vườn kỷ niệm phải tính lại cây từ dữ liệu còn tải được thay vì dùng "ảnh chụp" lúc kết thúc chu kỳ.

## Bước 2. Cập nhật Edge Function `ai` (3 phút)

Chỉ cần nếu đã bật AI ở giai đoạn 2a. Nút **AI nhận xét tuần** cần code mới.

1. Mở file [`supabase/functions/ai/index.ts`](../supabase/functions/ai/index.ts) trên GitHub → **Copy raw file**.
2. Supabase → **Edge Functions** → bấm vào function **`ai`** → tab **Code**.
3. Xóa hết code cũ trong khung soạn thảo, dán code vừa chép → **Deploy**. Chờ khoảng 30 giây.
4. Không cần đổi Secrets. Mục **Verify JWT** vẫn để **tắt** như cũ.

## Bước 3. Kiểm tra (1 phút)

1. Mở app, tải lại trang (hoặc bấm **Tải lại** khi có dải "Có bản cập nhật mới").
2. **Cài đặt** → cuối trang ghi "bản giai đoạn 3".
3. **Tổng quan → Nhìn lại tuần** → gõ thử vào ô "Tuần này mình làm tốt điều gì?" → **Lưu phần nhìn lại**. Không có dòng nhắc màu vàng về 003_gd3.sql là Bước 1 đã xong.
4. Bấm **AI nhận xét tuần này**. Có nhận xét hiện ra là Bước 2 đã xong.

Muốn xem nhanh mà không cần dữ liệu thật: chế độ **Xem thử** đã có sẵn một cây đang héo, nhật ký 10 ngày, một tuần đã nhìn lại và một khu vườn kỷ niệm. Nếu trước đây đã mở chế độ xem thử, vào **Cài đặt → Nạp lại dữ liệu mẫu** để thấy dữ liệu mới.

---

## Về nhật ký và quyền riêng tư

- Nhật ký nằm trong bảng `journals`, có Row Level Security như mọi bảng khác: chỉ chính người viết đọc được qua app.
- Khi người dùng bấm **AI nhận xét tuần**, server gửi cho Gemini số liệu của tuần đó, **nhật ký của 7 ngày trong tuần** và ba câu tự nhìn lại, để nhận xét sát hơn. Các nút AI khác vẫn không gửi nhật ký. Không gửi email hay tên tài khoản.
