# Kairos

**Focus on what matters.** Web app (PWA) quản lý mục tiêu, thời gian và thói quen cho sinh viên, dựa trên nguyên lý Pareto 80/20 và phương pháp The 12 Week Year.

- Đi từ **mục tiêu dài hạn** (3–5 năm) → **2–3 mục tiêu cho 12 tuần** → **đầu việc hằng ngày**.
- Mỗi việc mang nhãn **Việc 20%** (đòn bẩy cao, tưới +3 💧) hoặc **Việc 80%** (tưới +1 💧).
- Mỗi mục tiêu 12 tuần là một cây trong **Vườn**, lớn lên theo số 💧 nhận được.

## Bắt đầu

👉 **[Hướng dẫn triển khai giai đoạn 1](docs/HUONG-DAN-GD1.md)**: đưa app lên mạng, nối database, bật đăng nhập Google, cài app lên điện thoại và máy tính. Không cần cài gì lên máy.

👉 **[Hướng dẫn bật AI (giai đoạn 2a)](docs/HUONG-DAN-GD2A.md)**: chạy thêm 1 file SQL, lấy khóa Gemini, tạo Edge Function `ai`. Khoảng 15 phút.

👉 **[Hướng dẫn giai đoạn 3](docs/HUONG-DAN-GD3.md)**: chạy 1 file SQL nhỏ và cập nhật code Edge Function `ai`. Khoảng 5 phút.

Muốn xem giao diện ngay: mở app và bấm **Xem thử với dữ liệu mẫu** (không cần tài khoản).

## Các giai đoạn

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Đăng nhập, onboarding, đầu việc, lịch cố định, Hôm nay, Nháp, 6 theme, PWA | ✅ Xong |
| 2a | AI gợi ý đầu việc, gắn nhãn 20/80, diễn đạt mục tiêu, nhận xét liên kết, xếp Nháp, xếp lịch Hôm nay | ✅ Xong (cần bật theo hướng dẫn) |
| 2b | Focus + âm thanh + thống kê | ✅ Xong |
| 3 | Vườn đầy đủ (héo/hồi phục, kỷ niệm), nhật ký ngày, nhìn lại tuần, AI nhận xét tuần, lịch sử dạng lịch | ✅ Xong (cần làm theo hướng dẫn GĐ3) |
| 4 | Web Push, nhắc deadline 7/3/1 ngày, Tổng quan đầy đủ, hoàn thiện | |

## Công nghệ

React 19 · Vite · TypeScript · Tailwind CSS 4 · zustand · Supabase (Auth + Postgres + RLS + Edge Functions) · Gemini API · Vercel.

## Cấu trúc thư mục

```
index.html              Trang gốc
public/                 Icon, logo, manifest của PWA
pwa/sw.js               Service worker (mẫu; được điền phiên bản lúc build)
src/
  main.tsx, App.tsx     Khởi động app, chọn màn hình theo trạng thái đăng nhập
  index.css             6 theme (sáng + tối), nhiễu hạt, hiệu ứng
  lib/
    types.ts            Kiểu dữ liệu (trùng tên cột trong database)
    store.ts            Kho dữ liệu: tải, lưu, đồng bộ, chế độ xem thử
    logic.ts            Việc của ngày, thứ tự ưu tiên, điểm 💧, khung trống, tự xếp việc, điểm tuần
    garden.ts           Cây héo/hồi phục, hiệu ứng lên giai đoạn, kết thúc chu kỳ, Khu vườn kỷ niệm
    review.ts           Số liệu nhật ký ngày, nhìn lại tuần, lịch sử dạng lịch
    dates.ts            Ngày giờ kiểu Việt Nam (dd/mm/yyyy, tuần bắt đầu thứ Hai)
    seed.ts             Dữ liệu mẫu
    supabase.ts         Kết nối Supabase
    ai.ts               Gọi AI qua Edge Function, đếm lượt, báo lỗi dễ hiểu
    themes.ts, pwa.ts   Theme; cài app và cập nhật phiên bản
  components/           Nút, thẻ, bảng trượt, cây/hoa SVG, tranh nền, dòng thời gian, các bảng thêm/sửa
  pages/                Login, Onboarding, Today, Goals, Inbox, Garden, Focus, Overview, WeekReview, JournalPage, History, Settings
supabase/migrations/    File SQL tạo database (bảng + Row Level Security), chạy theo thứ tự 001, 002…
supabase/functions/ai/  Edge Function AI (khóa Gemini chỉ nằm ở đây, trên server)
docs/                   Hướng dẫn cho từng giai đoạn
```

## Lệnh

```
npm install      # cài thư viện (một lần)
npm run dev      # chạy thử trên máy: http://localhost:5173
npm run build    # kiểm tra kiểu + build ra thư mục dist/
npm run preview  # chạy bản đã build (có service worker)
```

## Bảo mật

- Trình duyệt chỉ giữ **Publishable key** của Supabase. Mọi bảng bật Row Level Security nên mỗi người chỉ đọc và ghi được dữ liệu của chính mình.
- Khóa bí mật (Supabase Secret key, khóa Gemini, khóa VAPID) chỉ nằm ở server từ giai đoạn 2 trở đi, không bao giờ nằm trong repo này.
