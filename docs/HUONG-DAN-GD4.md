# Kairos · Hướng dẫn giai đoạn 4

Khoảng **10 phút**, làm hoàn toàn trong trình duyệt. Code giao diện đã tự lên Vercel khi push; bạn chỉ cần làm 2 việc ở Supabase, rồi bật thông báo trong app.

Không cần tự tạo khóa VAPID, không cần sửa địa chỉ nào trong file SQL: function `tick` tự tạo cặp khóa ở lần đầu và tự ghi địa chỉ của nó để cron gọi tới.

## Giai đoạn 4 có gì mới

| Ở đâu | Tính năng |
|---|---|
| **Chuông** (góc trên các trang chính) | Danh sách thông báo, chấm đỏ là chưa đọc. Bấm một thông báo là mở đúng trang. Hoạt động cả khi chưa bật thông báo trên thiết bị. |
| **Thông báo đẩy** (Web Push) | **Tóm tắt buổi sáng** (hôm nay có mấy việc, việc 20% nào, nên bắt đầu từ đâu), **nhắc deadline quan trọng** trước 7, 3, 1 ngày, **nhắc viết nhật ký** nếu tối đó chưa viết (tối Chủ nhật nhắc thêm nhìn lại tuần). |
| **Cài đặt → Thông báo** | Bật / tắt / gửi thử trên từng thiết bị; bật tắt từng loại nhắc và chọn giờ (mặc định 07:00 và 21:30). |
| **Tổng quan** | Thêm các con số chính của chu kỳ, **Deadline sắp tới** (2 tuần), **Giờ focus** (tuần này, cả chu kỳ, tỉ lệ thời gian cho việc 20%), bấm vào mục tiêu để xem **chi tiết từng đầu việc**. |

Chỉ việc có bật **Deadline quan trọng** (trong bảng sửa đầu việc, cần có hạn) mới được nhắc 7/3/1 ngày. Mọi nội dung nhắc làm bằng quy tắc, không tốn lượt AI.

---

## Bước 1. Chạy file SQL mới (1 phút)

1. Mở file [`supabase/migrations/004_gd4.sql`](../supabase/migrations/004_gd4.sql) trên GitHub → bấm **Copy raw file**.
2. Supabase → **SQL Editor** → **New query** → dán → **Run**.
3. Thấy `Success` là được. Chạy lại nhiều lần cũng không sao.

File này làm 3 việc: tạo bảng `kairos_config` (chỉ server đọc được), bật hai tiện ích có sẵn của Supabase là **pg_cron** (hẹn giờ) và **pg_net** (gọi web từ database), và hẹn lịch gọi function `tick` mỗi 15 phút.

> Nếu Supabase báo lỗi quyền khi bật extension: vào **Database → Extensions**, tìm và bật **pg_cron** và **pg_net**, rồi chạy lại file.

## Bước 2. Tạo Edge Function `tick` (3 phút)

1. Mở file [`supabase/functions/tick/index.ts`](../supabase/functions/tick/index.ts) trên GitHub → **Copy raw file**.
2. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
3. Đặt tên đúng là **`tick`** (chữ thường). Xóa code mẫu, dán code vừa chép → **Deploy function**. Chờ khoảng 30 giây.
4. Vào function **tick** → tab **Details** (hoặc **Settings**) → tắt **Verify JWT** (Enforce JWT verification) → **Save**. Giống function `ai`: cron gọi function này không kèm đăng nhập; function tự kiểm tra bằng mã bí mật trong `kairos_config`.
5. Không cần thêm Secret nào.

**Kiểm tra nhanh:** ở trang function `tick` có địa chỉ dạng `https://xxxx.supabase.co/functions/v1/tick`. Mở địa chỉ đó trong tab mới, sẽ thấy một trang chữ:

```
Kairos · Edge Function "tick" (giai đoạn 4)

✓ Đã chạy 004_gd4.sql
✓ Cron sẽ gọi: https://xxxx.supabase.co/functions/v1/tick
✓ Khóa VAPID: function tự tạo và lưu trong kairos_config (BEx3…)
… Cron chưa chạy lần nào. Chờ tối đa 15 phút rồi tải lại trang này.
```

Lần mở này cũng là lúc function ghi địa chỉ của nó cho cron, nên cron bắt đầu chạy từ mốc 15 phút kế tiếp. Sau khoảng 15 phút tải lại trang sẽ thấy `✓ Cron chạy lần gần nhất … phút trước`.

## Bước 3. Bật thông báo trong app (2 phút)

1. Mở app, tải lại trang (hoặc bấm **Tải lại** khi có dải "Có bản cập nhật mới").
2. **Cài đặt** → cuối trang ghi "bản giai đoạn 4".
3. Mục **Thông báo** → **Bật thông báo** → trình duyệt hỏi quyền → **Cho phép**.
4. Bấm **Gửi thử**. Vài giây sau có thông báo "🌱 Kairos đã kết nối", và chuông trong app có thêm một dòng.

Mỗi thiết bị (điện thoại, máy tính) bật riêng. Người dùng nào cũng tự bật trên máy của mình.

---

## Kiểm thử trên điện thoại

### Android (Chrome)

1. Mở địa chỉ app bằng **Chrome** → đăng nhập.
2. Nên cài app: menu ⋮ → **Cài đặt ứng dụng / Thêm vào màn hình chính** (không bắt buộc với Android, nhưng giống trải nghiệm thật hơn).
3. **Cài đặt → Thông báo → Bật thông báo** → **Cho phép** → **Gửi thử**.
4. Khóa màn hình hoặc vuốt tắt app, nhờ người khác (hoặc máy tính) bấm **Gửi thử** bằng cùng tài khoản: thông báo vẫn tới.

### iPhone / iPad (Safari, iOS 16.4 trở lên)

Apple chỉ cho web app gửi thông báo khi **đã cài vào màn hình chính**.

1. Mở địa chỉ app bằng **Safari** → nút **Chia sẻ** → **Thêm vào MH chính** → **Thêm**.
2. Mở Kairos **từ biểu tượng trên màn hình chính** (không mở trong Safari) → đăng nhập lại.
3. **Cài đặt → Thông báo → Bật thông báo** → **Cho phép** → **Gửi thử**.
4. Nếu vẫn không thấy: iPhone **Cài đặt → Thông báo → Kairos** → bật **Cho phép thông báo**. Chế độ Tập trung / Không làm phiền cũng có thể chặn.

### Danh sách kiểm thử cho nhóm (mỗi người làm trên máy mình)

| # | Việc cần thử | Kết quả mong đợi |
|---|---|---|
| 1 | Bật thông báo, bấm Gửi thử | Thông báo hiện trong vài giây; chuông có thêm dòng mới |
| 2 | Bấm vào thông báo khi app đang đóng | App mở đúng trang Cài đặt, dòng đó trong chuông thành "đã đọc" |
| 3 | Đặt giờ tóm tắt sáng sớm hơn giờ hiện tại khoảng 5 phút (vd đang 14:07 thì đặt 14:00) | Trong vòng 15 phút có "☀️ Hôm nay có … việc" (mỗi ngày chỉ một lần; đặt lại giờ để thử lại vào hôm sau) |
| 4 | Tạo việc một lần có hạn đúng **3 ngày nữa** (hoặc 7 ngày, hoặc ngày mai), bật **Deadline quan trọng**. Giữ giờ tóm tắt sáng như #3 | Trong vòng 15 phút có "⏰ Còn 3 ngày: …" (hoặc "Còn 7 ngày", "Ngày mai hết hạn") |
| 5 | Chưa viết nhật ký, đặt giờ nhắc nhật ký sớm hơn giờ hiện tại vài phút | Có "🌙 Hôm nay của bạn thế nào?"; viết nhật ký rồi thì hôm sau mới nhắc lại |
| 6 | Tắt thông báo trong Cài đặt rồi Gửi thử | Không có thông báo đẩy, chỉ thấy trong chuông |
| 7 | Đăng xuất trên máy đó | Máy đó không nhận thông báo của tài khoản cũ nữa |
| 8 | Tổng quan: bấm một mục tiêu, bấm một deadline | Mở chi tiết mục tiêu / bảng sửa đầu việc |
| 9 | Bật chế độ máy bay, mở app | Vẫn xem được Tổng quan và chuông (dữ liệu đã tải), không sửa được |

Ghi lại máy, hệ điều hành, trình duyệt và bước nào không đúng để sửa ở bản sau.

---

## Khi có trục trặc

| Hiện tượng | Cách xử lý |
|---|---|
| Cài đặt báo "Máy chủ thông báo chưa được bật" | Chưa làm Bước 1 hoặc Bước 2, hoặc đặt tên function khác `tick`. |
| Cài đặt báo "Máy chủ nhắc chưa chạy gần đây" | Mở địa chỉ function `tick` trong trình duyệt (xem Bước 2) và đọc dòng ✗. Kiểm tra Supabase → **Integrations → Cron** có job `kairos-tick`. |
| Gửi thử báo "Gửi thử chưa tới được thiết bị" | Tắt rồi bật lại thông báo trong Cài đặt. Trên iPhone phải mở từ biểu tượng màn hình chính. |
| Thông báo đến trễ vài phút | Bình thường: cron chạy mỗi 15 phút, và điện thoại tiết kiệm pin có thể giữ thông báo lại một lúc. |
| Muốn tự đặt khóa VAPID | Thêm Secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (base64url) cho function. Thiết bị đã bật sẽ tự đăng ký lại khi mở app. |
| Muốn dừng hẳn nhịp nhắc | SQL Editor: `select cron.unschedule('kairos-tick');` (chạy lại 004_gd4.sql để bật lại). |

---

## Về quyền riêng tư

- Bảng `push_subscriptions` chỉ lưu địa chỉ nhận thông báo mà trình duyệt cấp cho thiết bị và một tên ngắn kiểu "Android · Chrome". Không lưu số điện thoại hay vị trí.
- Nội dung thông báo được **mã hóa đầu-cuối** tới thiết bị (chuẩn Web Push); máy chủ của Google/Apple/Mozilla chỉ chuyển tiếp, không đọc được.
- Thông báo chỉ nhắc tên việc, tên mục tiêu và số liệu đếm; **không bao giờ chứa nội dung nhật ký**.
- Thông báo trong chuông tự xóa sau 45 ngày.
