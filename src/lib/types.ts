// Kiểu dữ liệu của Kairos. Tên trường trùng với tên cột trong database (Supabase).

export type ThemeId = 'tan-rung' | 'dinh-tuyet' | 'linh-lan' | 'giay-kem' | 'trang-den' | 'pastel';
export type DarkMode = 'system' | 'light' | 'dark';
export type PlantSpecies = 'sen' | 'ly' | 'linh-lan' | 'tan-tron' | 'thong';

/** Cài đặt lưu trong cột profiles.settings (JSON) */
export interface ProfileSettings {
  /** Giờ bắt đầu và kết thúc một ngày trên dòng thời gian, tính bằng phút từ 0h */
  day_start_min?: number;
  day_end_min?: number;
}

export interface Profile {
  id: string;
  display_name: string;
  theme: ThemeId;
  dark_mode: DarkMode;
  timezone: string;
  onboarded_at: string | null;
  settings: ProfileSettings;
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

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
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
  /** Deadline quan trọng: sẽ được nhắc trước 7, 3 và 1 ngày (giai đoạn 4) */
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
  /** Số giọt nước 💧: 3 cho việc 20%, 1 cho việc 80% */
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

/** Một phiên Focus. Chỉ ghi phiên tập trung (không ghi giờ nghỉ). */
export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  goal_id: string | null;
  started_at: string;
  ended_at: string | null;
  /** Số phút đã đặt (25/50/90/tự đặt) */
  planned_min: number;
  /** Số giây thực sự tập trung (không tính lúc tạm dừng) */
  actual_sec: number;
  /** true = chạy hết giờ; false = dừng sớm */
  completed: boolean;
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
];

/** Toàn bộ dữ liệu của một người dùng */
export type Snapshot = { profile: Profile } & { [K in TableName]: Tables[K][] };
