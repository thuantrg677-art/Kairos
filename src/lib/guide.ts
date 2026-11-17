// Hướng dẫn sử dụng + "Tập làm quen":
// - Người mới đăng nhập lần đầu xem hướng dẫn (src/pages/Guide.tsx) trước phần thiết lập 4 bước.
//   Mở lại bất cứ lúc nào ở Cài đặt → Hướng dẫn sử dụng (đường dẫn /huong-dan).
// - Thẻ "Tập làm quen" ở màn Hôm nay (src/components/Practice.tsx): 8 bước nhỏ, tự đánh dấu xong theo dữ liệu thật.
// - Các mục tiêu và đầu việc mẫu để người mới tập với những thứ nhỏ, dễ làm.

import { useStore } from './store';
import type { ProfileSettings, Snapshot, Task } from './types';

/** Ghi thêm vào profiles.settings (giữ nguyên các trường khác) */
export function patchSettings(patch: Partial<ProfileSettings>) {
  const st = useStore.getState();
  const p = st.profile;
  if (!p) return;
  st.updateProfile({ settings: { ...p.settings, ...patch } });
}

export const markGuideSeen = () => patchSettings({ guide_seen_at: new Date().toISOString() });

// ------------------------------------------------------------
// Nhóm phát triển
// ------------------------------------------------------------
export const TEAM: { name: string; role: string }[] = [
  { name: 'Nguyễn Thùy Linh Trang', role: 'Trưởng nhóm' },
  { name: 'Nguyễn Đức Cảnh', role: 'Marketing & nội dung' },
  { name: 'Lục Lê Thanh Mai', role: 'Ý tưởng tính năng & UI/UX' },
  { name: 'Nguyễn Quỳnh Nhi', role: 'Vận hành & tài liệu' },
  { name: 'Phạm Nguyễn An Nhi', role: 'Nghiên cứu thị trường & đối thủ' },
  { name: 'Trần Vũ Yến Nhi', role: 'Tài chính & mô hình kinh doanh' },
  { name: 'Nguyễn Toàn', role: 'Khảo sát & kiểm thử người dùng' },
  { name: 'Đặng Nguyễn Kim Tú', role: 'Phát triển sản phẩm' },
];

// ------------------------------------------------------------
// Mẫu để tập làm quen
// ------------------------------------------------------------
export const STARTER_VISIONS: { title: string; area: string; description: string }[] = [
  { title: 'Tốt nghiệp loại giỏi và có việc làm đúng ngành', area: 'Học tập', description: 'Mình muốn ra trường với kiến thức vững và một công việc mình thích.' },
  { title: 'Khỏe mạnh, nhiều năng lượng mỗi ngày', area: 'Sức khỏe', description: 'Có sức khỏe tốt thì mới theo được những mục tiêu khác.' },
  { title: 'Dùng tiếng Anh tự tin trong học tập và công việc', area: 'Phát triển bản thân', description: '' },
  { title: 'Tự lập tài chính, có một khoản tiết kiệm riêng', area: 'Tài chính', description: '' },
];

export const STARTER_GOALS: { title: string; measure: string }[] = [
  { title: 'Đọc xong 3 cuốn sách', measure: 'Số cuốn đã đọc xong (khoảng 1 cuốn mỗi 4 tuần)' },
  { title: 'Tập thể dục đều 3 buổi mỗi tuần', measure: 'Số buổi tập mỗi tuần, ít nhất 30 phút/buổi' },
  { title: 'Học thuộc 600 từ vựng tiếng Anh', measure: 'Số từ đã thuộc, 50 từ mỗi tuần' },
  { title: 'Hoàn thành đồ án môn học trước hạn 1 tuần', measure: 'Các phần của đồ án đã xong và được góp ý' },
];

export type StarterTask = Pick<Task, 'title' | 'kind' | 'weekdays' | 'estimate_min' | 'leverage' | 'leverage_reason'> & {
  /** Gắn vào mục tiêu đầu tiên (false = việc lẻ) */
  withGoal: boolean;
};

export const STARTER_TASKS: StarterTask[] = [
  { title: 'Chia mục tiêu thành 3 bước nhỏ', kind: 'once', weekdays: [], estimate_min: 15, leverage: 'high', leverage_reason: 'Biết rõ bước đầu tiên thì bắt tay vào làm dễ hơn hẳn.', withGoal: true },
  { title: 'Làm 25 phút đầu tiên cho mục tiêu', kind: 'once', weekdays: [], estimate_min: 25, leverage: 'high', leverage_reason: 'Bắt đầu sớm tạo đà cho cả chu kỳ.', withGoal: true },
  { title: 'Tìm một tài liệu hay cho mục tiêu', kind: 'once', weekdays: [], estimate_min: 30, leverage: 'normal', leverage_reason: '', withGoal: true },
  { title: 'Dọn góc học tập 15 phút', kind: 'once', weekdays: [], estimate_min: 15, leverage: 'normal', leverage_reason: '', withGoal: false },
];

// ------------------------------------------------------------
// Các bước tập làm quen
// ------------------------------------------------------------
type PracticeData = Pick<Snapshot, 'tasks' | 'task_completions' | 'schedule_blocks' | 'focus_sessions' | 'inbox_items' | 'journals' | 'weekly_reviews'>;

export type PracticeAction =
  | { kind: 'route'; to: string; label: string }
  | { kind: 'scroll'; id: string; label: string }
  | { kind: 'task'; label: string };

export interface PracticeStep {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  action: PracticeAction;
  done: boolean;
}

export function practiceSteps(d: PracticeData): PracticeStep[] {
  const goalTasks = d.tasks.filter((t) => t.goal_id && !t.archived_at).length;
  return [
    {
      id: 'tasks',
      emoji: '📝',
      title: 'Thêm 3 đầu việc cho mục tiêu',
      hint: 'Chia mục tiêu thành những việc nhỏ, mỗi việc khoảng 15–60 phút. Chưa nghĩ ra thì chọn một gợi ý bên dưới.',
      action: { kind: 'task', label: 'Thêm việc' },
      done: goalTasks >= 3,
    },
    {
      id: 'high',
      emoji: '⚡',
      title: 'Đánh dấu một Việc 20%',
      hint: 'Việc nào giúp mục tiêu tiến xa nhất? Mở việc đó và chọn "Việc 20%". Không chắc thì bấm ✨ AI gợi ý nhãn.',
      action: { kind: 'route', to: '/muc-tieu', label: 'Mở Mục tiêu' },
      done: d.tasks.some((t) => t.leverage === 'high'),
    },
    {
      id: 'schedule',
      emoji: '🗓️',
      title: 'Xếp giờ cho một việc',
      hint: 'Ở Dòng thời gian, bấm "Tự xếp" hoặc "AI xếp lịch" để đặt việc vào khung trống.',
      action: { kind: 'scroll', id: 'dong-thoi-gian', label: 'Tới Dòng thời gian' },
      done: d.schedule_blocks.some((b) => b.start_min != null),
    },
    {
      id: 'focus',
      emoji: '⏱️',
      title: 'Thử một phiên Focus 25 phút',
      hint: 'Chọn một việc, cất điện thoại, nhìn mầm cây lớn dần. Dừng sớm vẫn được ghi lại phần đã làm.',
      action: { kind: 'route', to: '/focus', label: 'Mở Focus' },
      done: d.focus_sessions.length > 0,
    },
    {
      id: 'tick',
      emoji: '💧',
      title: 'Làm xong một việc để tưới cây',
      hint: 'Bấm vào ô tròn bên trái việc. Việc 20% tưới +3 💧, việc 80% tưới +1 💧.',
      action: { kind: 'scroll', id: 'viec-hom-nay', label: 'Tới Việc hôm nay' },
      done: d.task_completions.length > 0,
    },
    {
      id: 'inbox',
      emoji: '✍️',
      title: 'Ghi một ý chợt nảy ra vào Nháp',
      hint: 'Bấm nút bút ở góc màn hình, gõ rồi nhấn Enter. Sắp xếp sau cũng được.',
      action: { kind: 'route', to: '/?ghi=1', label: 'Ghi nhanh' },
      done: d.inbox_items.length > 0,
    },
    {
      id: 'journal',
      emoji: '📓',
      title: 'Viết nhật ký cuối ngày',
      hint: 'Ba câu ngắn: năng lượng hôm nay, đã làm được gì, mai muốn làm tốt hơn điều gì.',
      action: { kind: 'scroll', id: 'nhat-ky-hom-nay', label: 'Tới Nhật ký' },
      done: d.journals.length > 0,
    },
    {
      id: 'review',
      emoji: '🔁',
      title: 'Nhìn lại tuần đầu tiên',
      hint: 'Cuối tuần, xem điểm thực thi và trả lời ba câu tự nhìn lại. Khoảng 5 phút.',
      action: { kind: 'route', to: '/tong-quan/tuan', label: 'Nhìn lại tuần' },
      done: d.weekly_reviews.some((r) => !!(r.ai_review || r.wins || r.lessons || r.next_focus)),
    },
  ];
}
