// Dữ liệu mẫu cho chế độ "Xem thử": một sinh viên đang ở tuần 5/12.
// Mọi ngày tháng tính tương đối so với hôm nay nên lúc nào mở cũng thấy hợp lý.

import type { FixedEvent, FocusSession, Goal, Journal, Snapshot, Task, TaskCompletion, WeeklyReview } from './types';
import { addDays, isoWeekday, mondayOf, todayISO } from './dates';
import { CYCLE_DAYS, taskPoints, weekStats } from './logic';

export const DEMO_USER = 'demo';
let n = 0;
const id = (prefix: string) => `${prefix}-${++n}`;

export function emptySnapshot(userId: string, onboarded = false): Snapshot {
  return {
    profile: {
      id: userId,
      display_name: '',
      theme: 'tan-rung',
      dark_mode: 'system',
      timezone: 'Asia/Ho_Chi_Minh',
      onboarded_at: onboarded ? new Date().toISOString() : null,
      settings: {},
      created_at: new Date().toISOString(),
    },
    visions: [],
    cycles: [],
    goals: [],
    tasks: [],
    task_completions: [],
    fixed_events: [],
    schedule_blocks: [],
    inbox_items: [],
    focus_sessions: [],
    journals: [],
    weekly_reviews: [],
  };
}

export function buildSeed(): Snapshot {
  n = 0;
  const today = todayISO();
  const u = DEMO_USER;
  const start = mondayOf(addDays(today, -28));
  const createdAt = `${start}T00:00:00.000Z`;
  const s = emptySnapshot(u, true);
  s.profile.display_name = 'Minh Anh';

  const v1 = { id: id('v'), user_id: u, title: 'Du học thạc sĩ và dùng tiếng Anh tự tin', description: 'Mình muốn học tiếp ở một môi trường quốc tế và tự tin trình bày ý tưởng bằng tiếng Anh.', area: 'Học tập', sort: 0, created_at: createdAt };
  const v2 = { id: id('v'), user_id: u, title: 'Khỏe mạnh, nhiều năng lượng mỗi ngày', description: 'Có sức khỏe tốt thì mới theo được những mục tiêu khác.', area: 'Sức khỏe', sort: 1, created_at: createdAt };
  s.visions = [v1, v2];

  const cycle = { id: id('c'), user_id: u, start_date: start, end_date: addDays(start, CYCLE_DAYS - 1), status: 'active' as const, created_at: createdAt };
  // Một chu kỳ đã xong trước đó, để Khu vườn kỷ niệm có sẵn một khu vườn
  const oldStart = addDays(start, -CYCLE_DAYS);
  const oldCycle = { id: id('c'), user_id: u, start_date: oldStart, end_date: addDays(start, -1), status: 'done' as const, created_at: `${oldStart}T00:00:00.000Z` };
  s.cycles = [oldCycle, cycle];

  const goal = (title: string, vision_id: string, measure: string, plant: Goal['plant'], sort: number): Goal => ({
    id: id('g'), user_id: u, cycle_id: cycle.id, vision_id, title, measure, due_date: cycle.end_date, plant, status: 'active', sort, created_at: createdAt,
  });
  const g1 = goal('Đạt IELTS 6.5', v1.id, 'Điểm thi thử từ 6.5 trở lên', 'sen', 0);
  const g2 = goal('Hoàn thành đồ án môn học đạt 8.5+', v1.id, 'Nộp đúng hạn, điểm từ 8.5', 'linh-lan', 1);
  const g3 = goal('Chạy liên tục 5 km', v2.id, 'Chạy 5 km không dừng', 'tan-tron', 2);
  const old = (title: string, vision_id: string, measure: string, plant: Goal['plant'], sort: number, final_stage: number, final_earned: number, final_total: number): Goal => ({
    id: id('g'), user_id: u, cycle_id: oldCycle.id, vision_id, title, measure, due_date: oldCycle.end_date, plant, status: 'done', sort,
    created_at: oldCycle.created_at, final_stage, final_earned, final_total,
  });
  s.goals = [
    old('Đọc xong 5 cuốn sách tiếng Anh dễ', v1.id, '5 cuốn, mỗi cuốn có ghi chú', 'ly', 0, 4, 142, 168),
    old('Tập thể dục 3 buổi mỗi tuần', v2.id, 'Đủ 36 buổi', 'thong', 1, 3, 96, 150),
    old('Đạt GPA học kỳ từ 3.2', v1.id, 'GPA cuối kỳ', 'tan-tron', 2, 2, 51, 140),
    g1,
    g2,
    g3,
  ];

  const task = (g: Goal, title: string, p: Partial<Task>): Task => ({
    id: id('t'), user_id: u, goal_id: g.id, title, kind: 'recurring', weekdays: [], due_date: null, estimate_min: 30,
    leverage: 'normal', leverage_reason: '', leverage_source: 'manual', important: false, done_at: null, archived_at: null,
    created_at: createdAt, ...p,
  });
  const daily = [1, 2, 3, 4, 5, 6, 7];
  s.tasks = [
    task(g1, 'Luyện 1 đề Listening và chữa từng lỗi sai', { weekdays: [1, 3, 5], estimate_min: 45, leverage: 'high', leverage_reason: 'Chữa lỗi sau mỗi đề là cách tăng điểm nhanh nhất: bạn sửa đúng chỗ mình hay sai.' }),
    task(g1, 'Viết 1 bài Writing Task 2 và nhờ chấm', { weekdays: [2, 6], estimate_min: 60, leverage: 'high', leverage_reason: 'Writing là kỹ năng kéo điểm tổng xuống nhiều nhất và chỉ tiến bộ khi có người góp ý.' }),
    task(g1, 'Học 15 từ vựng theo chủ đề', { weekdays: daily, estimate_min: 15 }),
    task(g1, 'Đăng ký lịch thi thử', { kind: 'once', due_date: addDays(today, 5), estimate_min: 20, important: true }),
    task(g2, 'Viết chương 2: cơ sở lý thuyết', { kind: 'once', due_date: addDays(today, 6), estimate_min: 120, leverage: 'high', important: true, leverage_reason: 'Chương này quyết định hướng của cả đồ án, các phần sau đều dựa vào nó.' }),
    task(g2, 'Họp nhóm chốt số liệu', { kind: 'once', due_date: addDays(today, 1), estimate_min: 60 }),
    task(g2, 'Đọc 1 tài liệu tham khảo và ghi chú', { weekdays: [2, 4], estimate_min: 40 }),
    task(g2, 'Làm slide báo cáo giữa kỳ', { kind: 'once', due_date: addDays(today, 12), estimate_min: 90, leverage: 'high', important: true, leverage_reason: 'Buổi báo cáo chiếm phần lớn điểm quá trình.' }),
    task(g3, 'Chạy bộ theo giáo án', { weekdays: [1, 3, 5, 7], estimate_min: 30, leverage: 'high', leverage_reason: 'Chỉ có chạy đều theo giáo án mới tăng được sức bền; các việc khác chỉ hỗ trợ.' }),
    task(g3, 'Giãn cơ 10 phút trước khi ngủ', { weekdays: daily, estimate_min: 10 }),
  ];

  // Lịch sử tick giả lập cho 4 tuần trước: việc 20% làm đều hơn việc 80%
  const completions: TaskCompletion[] = [];
  let k = 7;
  const rand = () => {
    k = (k * 9301 + 49297) % 233280;
    return k / 233280;
  };
  for (let d = start; d < today; d = addDays(d, 1)) {
    for (const t of s.tasks) {
      if (t.kind !== 'recurring' || !t.weekdays.includes(isoWeekday(d))) continue;
      // Mục tiêu đồ án bị bỏ bê vài ngày gần đây, để thấy cây "hơi héo"
      if (t.goal_id === g2.id && d > addDays(today, -5)) continue;
      if (rand() < (t.leverage === 'high' ? 0.8 : 0.6)) {
        completions.push({ id: id('k'), user_id: u, task_id: t.id, date: d, points: taskPoints(t), created_at: `${d}T12:00:00.000Z` });
      }
    }
  }
  s.task_completions = completions;

  // Lịch sử focus giả lập: phần lớn thời gian dành cho việc 20%
  const focus: FocusSession[] = [];
  for (let d = start; d < today; d = addDays(d, 1)) {
    for (const c of completions) {
      if (c.date !== d || rand() > 0.55) continue;
      const t = s.tasks.find((x) => x.id === c.task_id)!;
      const planned = t.estimate_min >= 60 ? 50 : 25;
      const done = rand() < 0.85;
      const hour = 8 + Math.floor(rand() * 13);
      const startedAt = new Date(`${d}T${String(hour).padStart(2, '0')}:00:00`);
      const sec = done ? planned * 60 : Math.round(planned * 60 * (0.3 + rand() * 0.5));
      focus.push({
        id: id('f'), user_id: u, task_id: t.id, goal_id: t.goal_id, started_at: startedAt.toISOString(),
        ended_at: new Date(startedAt.getTime() + sec * 1000).toISOString(), planned_min: planned, actual_sec: sec, completed: done,
        created_at: startedAt.toISOString(),
      });
    }
  }
  s.focus_sessions = focus;

  const ev = (title: string, weekday: number, start_min: number, end_min: number, color: string): FixedEvent => ({
    id: id('e'), user_id: u, title, weekday, start_min, end_min, color, created_at: createdAt,
  });
  s.fixed_events = [
    ev('Học trên trường', 1, 7 * 60, 11 * 60 + 30, 'blue'),
    ev('Học trên trường', 2, 13 * 60, 16 * 60 + 30, 'blue'),
    ev('Học trên trường', 3, 7 * 60, 11 * 60 + 30, 'blue'),
    ev('Câu lạc bộ', 3, 18 * 60, 19 * 60 + 30, 'purple'),
    ev('Học trên trường', 4, 13 * 60, 16 * 60 + 30, 'blue'),
    ev('Học trên trường', 5, 7 * 60, 9 * 60 + 30, 'blue'),
    ev('Làm thêm', 6, 8 * 60, 12 * 60, 'orange'),
    ev('Ăn tối với gia đình', 7, 18 * 60, 19 * 60 + 30, 'green'),
  ];

  const inbox = (content: string, daysAgo: number) => ({
    id: id('i'), user_id: u, content, processed_at: null, task_id: null, created_at: `${addDays(today, -daysAgo)}T09:00:00.000Z`,
  });
  // Nhật ký 10 ngày gần đây
  const notes: [string, string][] = [
    ['Làm xong đề Listening, sai ít hơn hôm trước. Chạy được 2 km không nghỉ.', 'Ngủ sớm hơn để sáng dậy học từ vựng.'],
    ['Đi học cả sáng, chiều họp nhóm đồ án hơi lâu.', 'Chuẩn bị trước nội dung họp để họp nhanh hơn.'],
    ['Viết được nửa bài Writing, nhờ bạn chấm giúp.', 'Tắt điện thoại khi focus, hôm nay bị xao nhãng nhiều.'],
    ['Ngày mệt, chỉ kịp giãn cơ và học từ vựng.', 'Không thức khuya xem phim nữa.'],
    ['Đọc xong một tài liệu tham khảo cho chương 2.', 'Bắt đầu viết chương 2 sớm hơn, đừng để sát hạn.'],
    ['Chạy bộ buổi sáng thấy rất khỏe.', 'Giữ nhịp chạy đều, không chạy quá nhanh đầu bài.'],
    ['Làm thêm cả sáng, chiều học được 1 tiếng.', 'Chia việc lớn thành phần nhỏ để làm được trong khung ngắn.'],
  ];
  const journals: Journal[] = [];
  for (let i = 10; i >= 1; i--) {
    if (i === 6 || i === 3) continue; // vài ngày quên viết
    const date = addDays(today, -i);
    const [did, improve] = notes[i % notes.length];
    journals.push({ id: id('j'), user_id: u, date, energy: 2 + Math.floor(rand() * 4), did, improve, created_at: `${date}T21:30:00.000Z` });
  }
  s.journals = journals;

  // Nhìn lại các tuần đã qua của chu kỳ hiện tại
  const reviews: WeeklyReview[] = [];
  for (let w = start; addDays(w, 6) < today; w = addDays(w, 7)) {
    const ws = weekStats(s, w, addDays(w, 6));
    reviews.push({ id: id('r'), user_id: u, week_start: w, planned: ws.planned, done: ws.done, ai_review: null, wins: '', lessons: '', next_focus: '', created_at: `${addDays(w, 6)}T20:00:00.000Z` });
  }
  const last = reviews[reviews.length - 1];
  if (last) {
    last.wins = 'Giữ được lịch luyện Listening đều cả tuần, chạy bộ đủ 4 buổi.';
    last.lessons = 'Đồ án bị để sau vì mình ngại bắt đầu chương 2. Tối thường mệt nên học không vào.';
    last.next_focus = 'Viết chương 2 vào buổi sáng thứ Ba và thứ Năm khi còn tỉnh táo.';
    last.ai_review = {
      headline: 'Tuần ổn định với tiếng Anh và chạy bộ, đồ án cần được ưu tiên lại',
      went_well: ['Các việc 20% của IELTS gần như không bỏ buổi nào.', 'Chạy bộ đều, đúng giáo án.'],
      improve: ['Mục tiêu đồ án gần như không được tưới trong tuần.', 'Nhiều phiên focus buổi tối bị dừng sớm.'],
      next_steps: ['Đặt 2 khung 90 phút buổi sáng cho chương 2.', 'Chuyển việc nhẹ như học từ vựng sang buổi tối.', 'Nhờ bạn cùng nhóm hẹn giờ nộp bản nháp.'],
      encouragement: 'Bạn đã chứng minh mình làm đều được, giờ chỉ cần dồn sức cho đúng việc. Cố lên nhé!',
      at: `${addDays(last.week_start, 6)}T20:05:00.000Z`,
    };
  }
  s.weekly_reviews = reviews;

  s.inbox_items = [inbox('Ý tưởng: làm flashcard từ vựng bằng Anki', 0), inbox('Hỏi thầy về format báo cáo', 1), inbox('Mua giày chạy mới', 2)];
  return s;
}
