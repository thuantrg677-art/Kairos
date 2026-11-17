# Kairos · Hướng dẫn triển khai giai đoạn 1

Làm theo thứ tự từ Bước 1 đến Bước 7, tổng cộng khoảng 40 phút. **Không cần cài gì lên máy tính**, mọi thứ làm trong trình duyệt.

Bạn sẽ dùng 4 dịch vụ, tất cả đều có gói miễn phí và không cần thẻ:

| Dịch vụ | Dùng để | Bạn đã có chưa |
|---|---|---|
| GitHub | Chứa code | Có rồi (repo `Kairos`) |
| Vercel | Đưa giao diện lên mạng | Tạo ở Bước 1 |
| Supabase | Tài khoản người dùng + database | Tạo ở Bước 2 |
| Google Cloud | Nút "Tiếp tục với Google" | Tạo ở Bước 6 |

> **Dùng email nào cũng được.** Supabase và Google Cloud không cần trùng email với GitHub hay với nhau. Riêng Vercel phải được nối với đúng tài khoản GitHub đang giữ repo `Kairos` (xem Bước 1).

Mở sẵn một file ghi chú để lưu 3 thứ sẽ lấy được trong lúc làm: **địa chỉ app**, **Project URL**, **Publishable key**.

> Tên nút trên các trang Supabase, Vercel, Google có thể lệch đôi chút so với hướng dẫn vì họ hay đổi giao diện. Nếu không thấy đúng tên, tìm nút có nghĩa tương tự.

---

## Bước 1. Đưa app lên mạng bằng Vercel (khoảng 5 phút)

Xong bước này bạn đã có một đường link để **xem thử toàn bộ giao diện với dữ liệu mẫu**, dù chưa có database.

1. Vào **vercel.com** → **Sign Up** → chọn **Hobby** (miễn phí) → **Continue with GitHub** (đăng nhập đúng tài khoản GitHub đang giữ repo `Kairos`).
   - Muốn tài khoản Vercel dùng email khác: chọn **Continue with Email**, rồi ở mục 2 bên dưới bấm **Continue with GitHub** trong khung **Import Git Repository** để nối tài khoản GitHub đó vào.
2. Bấm **Add New…** → **Project**.
3. Trong danh sách repo, tìm **Kairos** → bấm **Import**.
   - Không thấy repo? Bấm **Adjust GitHub App Permissions** và cho Vercel quyền xem repo `Kairos`.
4. Màn hình cấu hình: Vercel tự nhận ra đây là dự án **Vite**. Không đổi gì cả, bấm **Deploy**.
5. Chờ khoảng 1 phút. Khi thấy màn hình chúc mừng, bấm **Continue to Dashboard**. Địa chỉ app nằm ở mục **Domains**, dạng `https://kairos-abc123.vercel.app`. **Chép địa chỉ này vào ghi chú.**
6. Mở địa chỉ đó → bấm **Xem thử với dữ liệu mẫu**.

Lúc này phần đăng nhập còn mờ và có dòng "App chưa được nối với Supabase". Đó là bình thường, các bước sau sẽ bật nó lên.

---

## Bước 2. Supabase: tạo database (khoảng 10 phút)

1. Vào **supabase.com** → **Start your project** → đăng nhập bằng GitHub.
2. Bấm **New project** và điền:
   - **Name:** `kairos`
   - **Database Password:** bấm **Generate a password**, chép vào ghi chú (hiếm khi cần lại, nhưng nên giữ)
   - **Region:** **Southeast Asia (Singapore)**
   - Bấm **Create new project**, chờ 1–2 phút.
3. Tạo các bảng:
   - Mở file [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql) trên GitHub → bấm nút **Copy raw file** (biểu tượng hai ô vuông chồng nhau ở góc trên bên phải của khung code).
   - Quay lại Supabase → menu trái **SQL Editor** → **New query** → dán vào → bấm **Run**.
   - Thấy dòng `Success. No rows returned` là đúng. Nếu Supabase hỏi xác nhận vì câu lệnh có chữ "drop", cứ bấm đồng ý: file này chỉ xóa rồi tạo lại *chính sách bảo mật*, không xóa dữ liệu.
4. Lấy địa chỉ và khóa:
   - Bấm nút **Connect** ở đầu trang (hoặc vào **Project Settings** → **API Keys**).
   - Chép **Project URL** (dạng `https://abcd1234.supabase.co`).
   - Chép **Publishable key** (bắt đầu bằng `sb_publishable_`).
   - **Không dùng Secret key** (`sb_secret_…`) ở bất kỳ đâu trong giai đoạn 1. Khóa đó chỉ dành cho server ở các giai đoạn sau.

> Vì sao Publishable key được phép lộ ra trình duyệt? Vì mọi bảng đều bật Row Level Security: có khóa này mà chưa đăng nhập thì không đọc được gì, đăng nhập rồi thì chỉ đọc được dữ liệu của chính mình.

---

## Bước 3. Nối Vercel với Supabase (khoảng 3 phút)

1. Vào **vercel.com** → mở project **kairos** → tab **Settings** → **Environment Variables**.
2. Thêm 2 biến (để nguyên lựa chọn áp dụng cho mọi môi trường):

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL ở Bước 2 |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key ở Bước 2 |

3. Bấm **Save**.
4. **Quan trọng:** biến mới chỉ có hiệu lực ở lần build sau. Vào tab **Deployments** → ở dòng trên cùng bấm **⋯** → **Redeploy** → **Redeploy**.

---

## Bước 4. Khai báo địa chỉ app trong Supabase (khoảng 2 phút)

1. Supabase → menu trái **Authentication** → **URL Configuration**.
2. **Site URL:** dán địa chỉ app của bạn (ví dụ `https://kairos-abc123.vercel.app`) → **Save**.
3. **Redirect URLs** → **Add URL** → dán địa chỉ app và thêm `/**` vào cuối, ví dụ `https://kairos-abc123.vercel.app/**` → **Save**.

Thiếu bước này thì sau khi đăng nhập Google hoặc bấm link xác nhận email, người dùng sẽ bị đưa về `localhost` và thấy trang lỗi.

---

## Bước 5. Đăng nhập bằng email và mật khẩu (khoảng 2 phút)

Cách đăng nhập này đã bật sẵn. Bạn chỉ cần quyết định một việc:

Supabase → **Authentication** → **Sign In / Providers** → dòng **Email** → mục **Confirm email**.

- **Để bật (mặc định):** người đăng ký phải bấm link trong email rồi mới đăng nhập được. Hộp thư gửi sẵn của Supabase chỉ gửi được rất ít email mỗi giờ, nên chỉ hợp khi một mình bạn thử.
- **Tắt đi:** đăng ký xong dùng được ngay. Nên chọn cách này khi cho bạn bè dùng thử, hoặc khuyên họ đăng nhập bằng Google.

Bấm **Save** sau khi chọn.

---

## Bước 6. Đăng nhập bằng Google (khoảng 10 phút)

**6a. Lấy Callback URL từ Supabase**

Supabase → **Authentication** → **Sign In / Providers** → bấm dòng **Google**. Chép dòng **Callback URL (for OAuth)**, dạng `https://abcd1234.supabase.co/auth/v1/callback`. Để nguyên tab này, lát nữa quay lại.

**6b. Tạo "client" bên Google**

1. Vào **console.cloud.google.com** → đăng nhập Gmail → ở thanh trên cùng bấm ô chọn project → **New Project** → đặt tên `Kairos` → **Create** → chọn project vừa tạo.
2. Gõ `Google Auth Platform` vào ô tìm kiếm trên cùng và mở nó → bấm **Get started**:
   - **App name:** `Kairos`; **User support email:** Gmail của bạn
   - **Audience:** **External**
   - **Contact information:** Gmail của bạn
   - Tick đồng ý → **Create**.
3. Menu trái **Clients** → **Create client**:
   - **Application type:** **Web application**
   - **Name:** `Kairos web`
   - **Authorized JavaScript origins** → **Add URI** → dán địa chỉ app (không có dấu `/` ở cuối)
   - **Authorized redirect URIs** → **Add URI** → dán **Callback URL** ở bước 6a
   - **Create**.
4. Chép **Client ID** và **Client secret** hiện ra (Client secret chỉ hiện đầy đủ lúc này, hãy chép ngay).
5. Menu trái **Audience** → nếu **Publishing status** đang là *Testing*, bấm **Publish app**. Ở chế độ Testing chỉ những Gmail bạn thêm tay mới đăng nhập được.

**6c. Dán vào Supabase**

Quay lại tab Supabase ở bước 6a → bật **Enable Sign in with Google** → dán **Client ID** và **Client Secret** → **Save**.

---

## Bước 7. Kiểm tra

Mở địa chỉ app trên máy tính và tick từng dòng:

- [ ] Dòng "App chưa được nối với Supabase" đã biến mất.
- [ ] Bấm **Tiếp tục với Google** → chọn Gmail → quay lại app và thấy **Bước 1/4** của phần khởi đầu.
- [ ] Đi hết 4 bước: mục tiêu dài hạn → mục tiêu 12 tuần → lịch cố định → chọn cây và giao diện.
- [ ] Vào **Mục tiêu**, thêm một đầu việc "Lặp lại · hằng ngày", gắn nhãn **Việc 20%**.
- [ ] Về **Hôm nay**, tick việc đó: thấy 3 giọt 💧 bay lên và ô đầu trang đổi thành "1/1 việc · 3 💧".
- [ ] Bấm nút bút chì nổi, ghi một dòng, nhấn Enter → dòng đó nằm trong **Nháp**.
- [ ] Mở app trên điện thoại, đăng nhập cùng tài khoản: thấy đúng dữ liệu vừa tạo.
- [ ] Trong Supabase → **Table Editor** → bảng `tasks`: thấy dòng việc bạn vừa thêm.
- [ ] Tạo thử tài khoản thứ hai bằng email khác: tài khoản này **không** thấy dữ liệu của tài khoản đầu.

---

## Cài Kairos như một app

### iPhone / iPad
1. Mở địa chỉ app bằng **Safari**. Nếu bạn bấm link trong Zalo, Messenger hay Facebook thì trang mở trong trình duyệt riêng của các app đó và không cài được: bấm **⋯** → **Mở bằng Safari**.
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên lên) → **Thêm vào MH chính** → **Thêm**.
3. Mở Kairos từ biểu tượng trên màn hình chính và đăng nhập lại một lần.

Cần iOS 16.4 trở lên. Ở giai đoạn 4, iPhone chỉ nhận được thông báo khi Kairos được cài theo đúng cách này.

### Android
Mở bằng **Chrome** → bấm **⋮** → **Thêm vào màn hình chính** (hoặc **Cài đặt ứng dụng**) → **Cài đặt**. Bạn cũng có thể vào **Cài đặt** trong Kairos và bấm **Cài Kairos**.

### Windows (Chrome hoặc Edge)
1. Mở địa chỉ app → bấm biểu tượng **cài đặt** ở cuối thanh địa chỉ (hình màn hình có mũi tên xuống).
   - Chrome: hoặc **⋮** → **Truyền, lưu và chia sẻ** → **Cài đặt trang dưới dạng ứng dụng**.
   - Edge: hoặc **⋯** → **Ứng dụng** → **Cài đặt trang web này dưới dạng ứng dụng**.
2. Kairos mở trong cửa sổ riêng và có biểu tượng trên Desktop / Start.
3. **Ghim vào Taskbar:** khi Kairos đang mở, bấm chuột phải vào biểu tượng của nó trên Taskbar → **Ghim vào thanh tác vụ**.
4. **Gán phím tắt mở app:** bấm chuột phải vào biểu tượng Kairos trên Desktop → **Properties** → tab **Shortcut** → bấm vào ô **Shortcut key** → nhấn phím `K` (ô sẽ hiện `Ctrl + Alt + K`) → **OK**. Từ giờ nhấn `Ctrl + Alt + K` là mở Kairos.
5. Bấm chuột phải vào biểu tượng Kairos trên Taskbar sẽ thấy lối tắt **Ghi nhanh vào Nháp**.

### Mac
- Chrome: giống Windows ở bước 1. App nằm trong Launchpad, kéo vào Dock để ghim.
- Safari (macOS Sonoma trở lên): menu **File** → **Add to Dock**.

---

## Cập nhật app về sau

Mỗi khi code mới được đẩy lên GitHub, Vercel tự build và deploy lại sau khoảng 1 phút. Người đang mở app sẽ thấy thanh **"Có bản cập nhật mới của Kairos – Tải lại"**.

Khi một giai đoạn mới cần thêm bảng trong database, hướng dẫn của giai đoạn đó sẽ ghi rõ file SQL nào cần chạy thêm.

---

## Chạy trên máy tính của bạn (không bắt buộc)

Chỉ cần khi bạn muốn tự sửa code và xem thay đổi ngay.

1. Cài **Node.js** bản LTS từ nodejs.org.
2. Trên trang repo GitHub: **Code** → **Download ZIP** → giải nén.
3. Mở thư mục đó bằng Terminal (Windows: bấm chuột phải trong thư mục → **Open in Terminal**) rồi chạy:
   ```
   npm install
   ```
4. Chép file `.env.example` thành `.env.local`, mở ra và điền Project URL cùng Publishable key.
5. Chạy:
   ```
   npm run dev
   ```
   rồi mở `http://localhost:5173`. Muốn đăng nhập được ở địa chỉ này, thêm `http://localhost:5173/**` vào **Redirect URLs** (Bước 4) và `http://localhost:5173` vào **Authorized JavaScript origins** (Bước 6b).

Service worker (phần cài app và offline) chỉ chạy ở bản đã build, không chạy với `npm run dev`. Muốn thử: `npm run build` rồi `npm run preview`.

---

## Điều cần biết

- **Supabase miễn phí tự tạm dừng** dự án sau khoảng một tuần không có ai dùng. Khi đó app báo "Chưa tải được dữ liệu". Vào trang Supabase, mở project và bấm **Restore project** là chạy lại, dữ liệu vẫn còn. Từ giai đoạn 4, tác vụ nhắc lịch chạy định kỳ sẽ giữ cho dự án luôn hoạt động.
- **Offline:** app mở được và hiện dữ liệu của lần tải gần nhất. Tick việc hay ghi Nháp thì cần có mạng.
- **Giờ giấc** lấy theo đồng hồ của thiết bị. Tuần bắt đầu từ thứ Hai.
- **Repo đang để Public, và nên giữ như vậy khi dùng Vercel miễn phí.** Ai cũng xem được code, nhưng trong code không có khóa bí mật nào. Nếu đổi sang Private, gói Hobby của Vercel chỉ deploy những commit do chính chủ tài khoản Vercel đứng tên, nên các bản cập nhật do Claude đẩy lên sẽ bị chặn. Muốn để Private, hãy báo trước để các commit được đứng tên tài khoản GitHub của bạn.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách sửa |
|---|---|
| Vẫn thấy "App chưa được nối với Supabase" | Chưa thêm 2 biến ở Bước 3, gõ sai tên biến, hoặc chưa **Redeploy**. |
| Đăng nhập Google xong bị đưa về `localhost` hoặc trang trắng | **Site URL** ở Bước 4 chưa đúng địa chỉ app. |
| Google báo `redirect_uri_mismatch` | **Authorized redirect URIs** ở Bước 6b không trùng khít với Callback URL của Supabase. |
| Google báo "Access blocked" với Gmail của bạn bè | App Google còn ở chế độ *Testing*. Làm mục 5 của Bước 6b. |
| Bấm Google không có gì xảy ra, hoặc báo "provider is not enabled" | Chưa bật Google ở Bước 6c. |
| Đăng nhập được nhưng báo "Chưa tải được dữ liệu" | Chưa chạy file SQL ở Bước 2, hoặc dự án Supabase đang bị tạm dừng. |
| Đăng ký bằng email mãi không nhận được thư xác nhận | Hộp thư gửi sẵn của Supabase đã hết lượt trong giờ đó. Tắt **Confirm email** ở Bước 5. |
| Thêm/sửa xong thấy báo "Không lưu được thay đổi" | Mất mạng giữa chừng. App sẽ tự tải lại dữ liệu đúng từ server. |
