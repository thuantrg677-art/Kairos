// Kiểu dữ liệu của Kairos. Tên trường trùng với tên cột trong database (Supabase).

export type ThemeId = 'tan-rung' | 'dinh-tuyet' | 'linh-lan' | 'giay-kem' | 'trang-den' | 'pastel';
export type DarkMode = 'system' | 'light' | 'dark';
export type PlantSpecies =
  | 'sen'
  | 'ly'
  | 'linh-lan'
  | 'tan-tron'
  | 'thong'
  // Bản 2 (cần chạy 005_v2.sql)
  | 'la-kim'
  | 'xuong-rong'
  | 'huong-duong'
  | 'dong-tien'
  | 'hong';

/** Cài đặt lưu trong cột profiles.settings (JSON) */
export interface ProfileSettings {
  /** Giờ bắt đầu và kết thúc một ngày trên dòng thời gian, tính bằng phút từ 0h */
  day_start_min?: number;
  day_end_min?: number;
  /** Cài đặt nhắc (giai đoạn 4). Thiếu trường nào thì dùng mặc định trong NOTIFY_DEFAULTS. */
  notify?: Partial<NotifySettings>;
}

/** Giờ nhắc tính bằng phút từ 0h, theo múi giờ của thiết bị (profiles.timezone) */
export interface NotifySettings {
  /** Tóm tắt buổi sáng */
  morning: boolean;
  morning_min: number;
  /** Nhắc viết nhật ký nếu tối đó chưa viết */
  journal: boolean;
  journal_min: number;
  /** Nhắc việc có "Deadline quan trọng" trước 7, 3, 1 ngày (gửi cùng giờ tóm tắt sáng) */
  deadline: boolean;
}
export const NOTIFY_DEFAULTS: NotifySettings = { morning: true, morning_min: 7 * 60, journal: true, journal_min: 21 * 60 + 30, deadline: true };

export interface Profile {
  id: string;
  display_name: string;
  theme: ThemeId;
  dark_mode: DarkMode;
  timezone: string;
  onboarded_at: string | null;
  settings: ProfileSettings;
  /** Những điều Trợ lý AI ghi nhớ về bối cảnh của người dùng (cần 005_v2.sql) */
  ai_context?: string[];
  created_at: string;
}

/** Mục tiêu dài hạn (tầm nhìn 3–5 năm) */
export interface Vision {
  id: string;
  user_id: string;
  title: string;
  description: string;
  area: string;
  sort: number;
  created_at: string;
}

/** Chu kỳ 12 tuần. start_date luôn là thứ Hai. */
export interface Cycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'done';
  created_at: string;
}

/** Mục tiêu ngắn hạn trong một chu kỳ 12 tuần = một cây trong vườn */
export interface Goal {
  id: string;
  user_id: string;
  cycle_id: string;
  vision_id: string;
  title: string;
  measure: string;
  due_date: string;
  plant: PlantSpecies;
  status: 'active' | 'done' | 'dropped';
  sort: number;
  created_at: string;
  /** "Ảnh chụp" cây lúc kết thúc chu kỳ (Khu vườn kỷ niệm). Cần chạy 003_gd3.sql; chưa có thì để trống. */
  final_stage?: number | null;
  final_earned?: number | null;
  final_total?: number | null;
}

/**
 * Đầu việc (parent_id = null) hoặc Việc mỗi ngày (parent_id = id của đầu việc).
 * Bốn tầng: Mục tiêu dài hạn → Mục tiêu ngắn hạn (12 tuần) → Đầu việc → Việc mỗi ngày.
 * Việc mỗi ngày luôn là việc một lần, due_date = ngày định làm, goal_id và leverage lấy theo đầu việc.
 */
export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  /** Đầu việc cha (cần 005_v2.sql). Thiếu/null = đây là một đầu việc. */
  parent_id?: string | null;
  title: string;
  /** recurring = lặp lại theo thứ trong tuần; once = làm một lần */
  kind: 'recurring' | 'once';
  /** 1 = thứ Hai … 7 = Chủ nhật (chỉ dùng cho việc lặp lại) */
  weekdays: number[];
  due_date: string | null;
  estimate_min: number;
  /** high = "Việc 20% – đòn bẩy cao"; normal = "Việc 80%" */
  leverage: 'high' | 'normal';
  leverage_reason: string;
  leverage_source: 'manual' | 'ai';
  /** Deadline quan trọng: được nhắc trước 7, 3 và 1 ngày (Edge Function tick) */
  important: boolean;
  /** Việc một lần đã xong lúc nào */
  done_at: string | null;
  archived_at: string | null;
  created_at: string;
}

/** Mỗi lần tick hoàn thành một việc */
export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  /** Số giọt nước 💧 (xem POINTS trong logic.ts) */
  points: number;
  created_at: string;
}

/** Lịch cố định lặp lại hằng tuần (lịch học, lịch làm…) */
export interface FixedEvent {
  id: string;
  user_id: string;
  title: string;
  weekday: number;
  start_min: number;
  end_min: number;
  color: string;
  created_at: string;
}

/** Một việc được xếp vào một ngày. start_min = null nghĩa là "làm trong ngày, chưa xếp giờ". */
export interface ScheduleBlock {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  start_min: number | null;
  duration_min: number;
  source: 'manual' | 'auto' | 'ai';
  created_at: string;
}

/** Mục trong hộp Nháp */
export interface InboxItem {
  id: string;
  user_id: string;
  content: string;
  processed_at: string | null;
  task_id: string | null;
  created_at: string;
}

export interface FocusStep {
  title: string;
  minutes?: number;
  done?: boolean;
}

/**
 * Một phiên Focus. Từ bản 2, Focus là một "nghi thức": ghi điều định làm, (tùy chọn) các bước AI gợi ý,
 * bấm Bắt đầu và Dừng, rồi tự đánh giá phiên có hiệu quả không. Focus không tưới cây.
 */
export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  goal_id: string | null;
  started_at: string;
  ended_at: string | null;
  /** Bản cũ: số phút đã đặt. Bản 2 không đặt giờ nên ghi 0. */
  planned_min: number;
  /** Số giây từ lúc bấm Bắt đầu tới lúc bấm Dừng */
  actual_sec: number;
  completed: boolean;
  /** Các cột dưới đây cần 005_v2.sql */
  intention?: string;
  steps?: FocusStep[];
  /** Tự đánh giá: 3 = hiệu quả, 2 = bình thường, 1 = chưa hiệu quả, null = bỏ qua */
  rating?: number | null;
  reflection?: string;
  created_at: string;
}

/** Nhật ký một ngày (mỗi ngày một dòng) */
export interface Journal {
  id: string;
  user_id: string;
  date: string;
  /** Năng lượng trong ngày, 1 (kiệt sức) … 5 (tràn đầy) */
  energy: number | null;
  /** Hôm nay đã làm được gì */
  did: string;
  /** Ngày mai muốn làm tốt hơn điều gì */
  improve: string;
  created_at: string;
}

/** Kết quả AI nhận xét tuần (lưu trong cột weekly_reviews.ai_review) */
export interface AIWeekReview {
  headline: string;
  went_well: string[];
  improve: string[];
  next_steps: string[];
  encouragement: string;
  /** Lúc AI nhận xét */
  at: string;
}

/** Nhìn lại một tuần (tuần bắt đầu thứ Hai) */
export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  /** Số lượt việc theo kế hoạch / đã làm, chụp lại lúc lưu */
  planned: number;
  done: number;
  ai_review: AIWeekReview | null;
  /** Ba câu tự nhìn lại (cần 003_gd3.sql) */
  wins?: string;
  lessons?: string;
  next_focus?: string;
  updated_at?: string;
  created_at: string;
}

/** Thông báo trong app (chuông). Chỉ server tạo; app chỉ đọc và đánh dấu đã đọc. */
export interface AppNotification {
  id: string;
  user_id: string;
  /** morning | deadline | journal | test */
  kind: string;
  title: string;
  body: string;
  /** Đường dẫn trong app khi bấm vào */
  url: string;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
}

/** Một hành động Trợ lý AI đề xuất trong cuộc trò chuyện (người dùng chọn rồi mới được thêm vào kế hoạch) */
export interface ChatAction {
  type: 'vision' | 'goal' | 'task' | 'step' | 'label' | 'event';
  /** Mã để các hành động khác tham chiếu tới (vd "new1"), hoặc mã có sẵn trong dữ liệu (V1, G2, T5) */
  ref: string;
  /** Tham chiếu tới cha: mục tiêu dài hạn (goal), mục tiêu (task), đầu việc (step), việc cần gắn nhãn (label) */
  parent: string;
  title: string;
  detail: string;
  area: string;
  kind: 'once' | 'recurring';
  weekdays: number[];
  /** Hạn (goal/task) hoặc ngày làm (step) */
  date: string | null;
  estimate_min: number;
  leverage: 'high' | 'normal';
  reason: string;
  /** Lịch cố định (event): giờ bắt đầu/kết thúc tính bằng phút từ 0h */
  start_min: number;
  end_min: number;
}

export interface ChatMeta {
  /** Ảnh thu nhỏ người dùng gửi kèm (data URL) */
  image?: string;
  /** AI mô tả ngắn nội dung ảnh, để những lượt sau vẫn nhớ */
  image_note?: string;
  actions?: ChatAction[];
  /** Tiêu đề của nhóm đề xuất */
  actions_title?: string;
  /** Đã thêm những đề xuất nào vào kế hoạch (vị trí trong actions) */
  applied?: number[];
  quick_replies?: string[];
  /** Những điều AI vừa ghi nhớ thêm */
  remembered?: string[];
  /** AI cho rằng đã đủ thông tin để kết thúc phần làm quen */
  ready?: boolean;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'ai';
  content: string;
  meta: ChatMeta;
  created_at: string;
}

export interface Tables {
  visions: Vision;
  cycles: Cycle;
  goals: Goal;
  tasks: Task;
  task_completions: TaskCompletion;
  fixed_events: FixedEvent;
  schedule_blocks: ScheduleBlock;
  inbox_items: InboxItem;
  focus_sessions: FocusSession;
  journals: Journal;
  weekly_reviews: WeeklyReview;
  notifications: AppNotification;
  chat_messages: ChatMessage;
}
export type TableName = keyof Tables;
export const TABLE_NAMES: TableName[] = [
  'visions',
  'cycles',
  'goals',
  'tasks',
  'task_completions',
  'fixed_events',
  'schedule_blocks',
  'inbox_items',
  'focus_sessions',
  'journals',
  'weekly_reviews',
  'notifications',
  'chat_messages',
];

/** Toàn bộ dữ liệu của một người dùng */
export type Snapshot = { profile: Profile } & { [K in TableName]: Tables[K][] };
