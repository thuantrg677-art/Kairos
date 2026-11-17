// Các bảng thêm/sửa: đầu việc, mục tiêu 12 tuần, mục tiêu dài hạn.

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Trash2, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getActiveCycle } from '@/lib/logic';
import { todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import type { Goal, PlantSpecies, Task, Vision } from '@/lib/types';
import { Button, Chip, cx, Field, Sheet, Switch } from './ui';
import { DateField, PlantPicker, Segmented } from './pickers';
import { AIButton, AlignCheck, PhraseHelper } from './AI';
import { useAI } from '@/lib/ai';

export const AREAS = ['Học tập', 'Sự nghiệp', 'Sức khỏe', 'Tài chính', 'Các mối quan hệ', 'Phát triển bản thân'];
const ESTIMATES = [15, 30, 45, 60, 90, 120];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

// ------------------------------------------------------------
// Đầu việc
// ------------------------------------------------------------
export function TaskEditor({
  open,
  onClose,
  task,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Có task = sửa; không có = thêm mới */
  task?: Task | null;
  defaults?: Partial<Task>;
  onSaved?: (task: Task) => void;
}) {
  const goals = useStore((s) => s.goals);
  const cycles = useStore((s) => s.cycles);
  const cycle = getActiveCycle(cycles);
  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)), [goals, cycle]);

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [kind, setKind] = useState<Task['kind']>('once');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [due, setDue] = useState<string | null>(null);
  const [estimate, setEstimate] = useState(30);
  const [leverage, setLeverage] = useState<Task['leverage']>('normal');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<Task['leverage_source']>('manual');
  const [important, setImportant] = useState(false);
  const [doToday, setDoToday] = useState(false);
  const [error, setError] = useState('');

  // Mỗi lần mở bảng thì nạp lại giá trị
  useEffect(() => {
    if (!open) return;
    const src = task ?? defaults ?? {};
    setTitle(src.title ?? '');
    setGoalId(src.goal_id ?? '');
    setKind(src.kind ?? 'once');
    setWeekdays(src.weekdays ?? []);
    setDue(src.due_date ?? null);
    setEstimate(src.estimate_min ?? 30);
    setLeverage(src.leverage ?? 'normal');
    setReason(src.leverage_reason ?? '');
    setSource(src.leverage_source ?? 'manual');
    setImportant(src.important ?? false);
    setDoToday(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const ai = useAI();
  /** AI gắn nhãn 20/80 kèm lý do cho việc đang soạn */
  const aiLabel = async () => {
    if (!title.trim()) return setError('Nhập tên việc trước để AI xem xét.');
    setError('');
    const { result } = await ai.run('label', { items: [{ title: title.trim(), goal_id: goalId || null, kind, estimate_min: estimate }] });
    const l = result?.labels[0];
    if (!l) return;
    setLeverage(l.leverage);
    setReason(l.reason);
    setSource('ai');
  };
  /** Chọn nhãn bằng tay */
  const pickLeverage = (v: Task['leverage']) => {
    if (v !== leverage) {
      setLeverage(v);
      if (source === 'ai') setReason('');
    }
    setSource('manual');
  };

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));

  const save = () => {
    const t = title.trim();
    if (!t) return setError('Bạn chưa nhập tên việc.');
    if (kind === 'recurring' && weekdays.length === 0) return setError('Chọn ít nhất một ngày trong tuần để lặp lại.');
    const st = useStore.getState();
    const values = {
      goal_id: goalId || null,
      title: t,
      kind,
      weekdays: kind === 'recurring' ? weekdays : [],
      due_date: kind === 'once' ? due : null,
      estimate_min: Math.max(5, Math.min(600, estimate || 30)),
      leverage,
      leverage_reason: leverage === 'high' || source === 'ai' ? reason.trim() : '',
      leverage_source: source,
      important: kind === 'once' && !!due && important,
    };
    let saved: Task | null;
    if (task) {
      st.update('tasks', task.id, values);
      saved = { ...task, ...values };
    } else {
      saved = st.insert('tasks', { ...values, done_at: null, archived_at: null });
      if (saved && doToday && kind === 'once') {
        st.insert('schedule_blocks', { task_id: saved.id, date: todayISO(), start_min: null, duration_min: values.estimate_min, source: 'manual' });
      }
    }
    if (!saved) return;
    onSaved?.(saved);
    onClose();
  };

  const remove = () => {
    if (!task) return;
    if (!window.confirm(`Xóa việc "${task.title}"? Lịch sử hoàn thành của việc này cũng bị xóa.`)) return;
    useStore.getState().remove('tasks', task.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Sửa đầu việc' : 'Thêm đầu việc'}
      footer={
        <>
          {task && (
            <Button variant="danger" onClick={remove} aria-label="Xóa việc">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {task ? 'Lưu thay đổi' : 'Thêm việc'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tên việc">
          <input className="k-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="Ví dụ: Luyện 1 đề Listening" autoFocus={!task} />
        </Field>

        <Field label="Thuộc mục tiêu">
          <select className="k-input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">Không gắn mục tiêu (việc lẻ)</option>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Kiểu việc</span>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { id: 'once', label: 'Một lần' },
              { id: 'recurring', label: 'Lặp lại' },
            ]}
          />
        </div>

        {kind === 'recurring' ? (
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Lặp vào các ngày</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((d) => (
                <Chip key={d} selected={weekdays.includes(d)} onClick={() => toggleDay(d)} className="min-w-11 px-0">
                  {WEEKDAY_SHORT[d - 1]}
                </Chip>
              ))}
            </div>
            <button type="button" className="mt-2 min-h-9 text-sm font-semibold text-primary" onClick={() => setWeekdays(weekdays.length === 7 ? [] : ALL_DAYS)}>
              {weekdays.length === 7 ? 'Bỏ chọn tất cả' : 'Chọn hằng ngày'}
            </button>
          </div>
        ) : (
          <>
            <Field label="Deadline (nếu có)">
              <DateField value={due} onChange={setDue} clearable placeholder="Không có deadline" />
            </Field>
            {due && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">
                  <span className="font-semibold">Deadline quan trọng</span>
                  <span className="block text-[13px] text-muted">Được nhắc trước 7, 3 và 1 ngày (cài giờ nhắc trong Cài đặt → Thông báo)</span>
                </span>
                <Switch checked={important} onChange={setImportant} label="Deadline quan trọng" />
              </div>
            )}
            {!task && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">Làm ngay hôm nay</span>
                <Switch checked={doToday} onChange={setDoToday} label="Làm ngay hôm nay" />
              </div>
            )}
          </>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-semibold">Ước lượng thời gian</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {ESTIMATES.map((m) => (
              <Chip key={m} selected={estimate === m} onClick={() => setEstimate(m)}>
                {m < 60 ? `${m}′` : m % 60 === 0 ? `${m / 60} giờ` : `${Math.floor(m / 60)} giờ ${m % 60}′`}
              </Chip>
            ))}
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                value={estimate || ''}
                onChange={(e) => setEstimate(Number(e.target.value))}
                className="k-input !min-h-10 !w-20 !px-2 text-center"
                aria-label="Số phút tự đặt"
              />
              phút
            </label>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Việc này thuộc nhóm nào?</span>
            <AIButton busy={!!ai.busy} onClick={aiLabel} variant="ghost" className="-mr-2">
              AI gợi ý nhãn
            </AIButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={leverage === 'high'}
              onClick={() => pickLeverage('high')}
              className={cx('rounded-2xl border-2 p-3 text-left transition', leverage === 'high' ? 'border-high bg-highsoft' : 'border-line bg-surface')}
            >
              <span className="flex items-center gap-1 text-sm font-bold text-high">
                <Zap size={15} fill="currentColor" /> Việc 20%
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">Đòn bẩy cao, tạo ra phần lớn kết quả. Tưới +3 💧</span>
            </button>
            <button
              type="button"
              aria-pressed={leverage === 'normal'}
              onClick={() => pickLeverage('normal')}
              className={cx('rounded-2xl border-2 p-3 text-left transition', leverage === 'normal' ? 'border-primary bg-soft' : 'border-line bg-surface')}
            >
              <span className="text-sm font-bold text-ink">Việc 80%</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">Cần làm nhưng ít tác động hơn. Tưới +1 💧</span>
            </button>
          </div>
          {source === 'ai' && reason && (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
              <Sparkles size={13} /> Nhãn do AI gợi ý, bạn vẫn đổi được. Lý do:
            </p>
          )}
          {(leverage === 'high' || (source === 'ai' && reason)) && (
            <textarea
              className="k-input mt-2 resize-none"
              rows={2}
              maxLength={400}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={leverage === 'high' ? 'Vì sao đây là việc đòn bẩy cao? (không bắt buộc)' : 'Lý do (không bắt buộc)'}
            />
          )}
        </div>

        {error && <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------
// Mục tiêu 12 tuần
// ------------------------------------------------------------
export function GoalEditor({ open, onClose, goal, visionId, hidePlant }: { open: boolean; onClose: () => void; goal?: Goal | null; visionId?: string; hidePlant?: boolean }) {
  const visions = useStore((s) => s.visions);
  const cycles = useStore((s) => s.cycles);
  const goals = useStore((s) => s.goals);
  const cycle = getActiveCycle(cycles);

  const [title, setTitle] = useState('');
  const [vision, setVision] = useState('');
  const [measure, setMeasure] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [plant, setPlant] = useState<PlantSpecies>('sen');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setVision(goal?.vision_id ?? visionId ?? (visions.length === 1 ? visions[0].id : ''));
    setMeasure(goal?.measure ?? '');
    setDue(goal?.due_date ?? cycle?.end_date ?? null);
    setPlant(goal?.plant ?? nextPlant(goals));
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal?.id]);

  const activeCount = goals.filter((g) => g.status === 'active' && cycle && g.cycle_id === cycle.id).length;

  const save = () => {
    if (!cycle) return setError('Chưa có chu kỳ 12 tuần.');
    if (!title.trim()) return setError('Bạn chưa nhập tên mục tiêu.');
    if (!vision) return setError('Hãy chọn mục tiêu dài hạn mà mục tiêu này hỗ trợ.');
    if (!due) return setError('Hãy chọn ngày hoàn thành.');
    const st = useStore.getState();
    const values = { title: title.trim(), vision_id: vision, measure: measure.trim(), due_date: due, plant };
    if (goal) st.update('goals', goal.id, values);
    else {
      if (activeCount >= 3 && !window.confirm(`Bạn đã có ${activeCount} mục tiêu cho 12 tuần này. Chỉ nên đặt 2–3 mục tiêu để giữ được sự tập trung. Vẫn thêm mục tiêu thứ ${activeCount + 1}?`)) return;
      if (!st.insert('goals', { ...values, cycle_id: cycle.id, status: 'active', sort: goals.length })) return;
    }
    onClose();
  };

  const remove = () => {
    if (!goal) return;
    if (!window.confirm(`Xóa mục tiêu "${goal.title}" cùng toàn bộ đầu việc và cây của nó?`)) return;
    useStore.getState().remove('goals', goal.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? 'Sửa mục tiêu 12 tuần' : 'Thêm mục tiêu 12 tuần'}
      footer={
        <>
          {goal && (
            <Button variant="danger" onClick={remove} aria-label="Xóa mục tiêu">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {goal ? 'Lưu thay đổi' : 'Thêm mục tiêu'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!goal && activeCount >= 2 && (
          <p className="rounded-2xl bg-highsoft px-3 py-2 text-sm text-high">
            Bạn đang có {activeCount} mục tiêu. <b>Chỉ nên đặt 2–3 mục tiêu cho 12 tuần.</b>
          </p>
        )}
        <Field label="Trong 12 tuần này, bạn muốn đạt được gì?">
          <input className="k-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="Ví dụ: Đạt IELTS 6.5" />
        </Field>
        <Field label="Hỗ trợ mục tiêu dài hạn nào? (bắt buộc)">
          <select className="k-input" value={vision} onChange={(e) => setVision(e.target.value)}>
            <option value="">Chọn mục tiêu dài hạn…</option>
            {visions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đo bằng gì?" hint="Mục tiêu cần đo được, ví dụ: điểm thi thử từ 6.5, chạy 5 km không dừng.">
          <input className="k-input" value={measure} onChange={(e) => setMeasure(e.target.value)} maxLength={300} placeholder="Con số hoặc kết quả cụ thể" />
        </Field>
        <PhraseHelper
          target="goal"
          text={title}
          detail={measure}
          visionId={vision}
          onPick={(o) => {
            setTitle(o.title);
            if (o.detail) setMeasure(o.detail);
          }}
        />
        <Field label="Ngày hoàn thành">
          <DateField value={due} onChange={setDue} min={cycle?.start_date} max={cycle?.end_date} />
        </Field>
        <AlignCheck goalId={goal?.id} title={title} measure={measure} dueDate={due} visionId={vision} />
        {!hidePlant && (
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Cây đại diện trong Vườn</span>
            <PlantPicker value={plant} onChange={setPlant} />
          </div>
        )}
        {error && <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}

/** Gợi ý loài cây chưa dùng để vườn đa dạng */
export function nextPlant(goals: Goal[]): PlantSpecies {
  const order: PlantSpecies[] = ['sen', 'linh-lan', 'ly', 'tan-tron', 'thong'];
  const used = new Set(goals.filter((g) => g.status === 'active').map((g) => g.plant));
  return order.find((p) => !used.has(p)) ?? 'sen';
}

// ------------------------------------------------------------
// Mục tiêu dài hạn
// ------------------------------------------------------------
export function VisionEditor({ open, onClose, vision }: { open: boolean; onClose: () => void; vision?: Vision | null }) {
  const goals = useStore((s) => s.goals);
  const count = useStore((s) => s.visions.length);
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(vision?.title ?? '');
    setArea(vision?.area ?? '');
    setDescription(vision?.description ?? '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vision?.id]);

  const save = () => {
    if (!title.trim()) return setError('Bạn chưa viết mục tiêu dài hạn.');
    const st = useStore.getState();
    const values = { title: title.trim(), area, description: description.trim() };
    if (vision) st.update('visions', vision.id, values);
    else if (!st.insert('visions', { ...values, sort: count })) return;
    onClose();
  };

  const remove = () => {
    if (!vision) return;
    if (goals.some((g) => g.vision_id === vision.id)) {
      return setError('Mục tiêu dài hạn này đang có mục tiêu 12 tuần gắn vào. Hãy xóa hoặc chuyển các mục tiêu đó trước.');
    }
    if (!window.confirm(`Xóa mục tiêu dài hạn "${vision.title}"?`)) return;
    useStore.getState().remove('visions', vision.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={vision ? 'Sửa mục tiêu dài hạn' : 'Thêm mục tiêu dài hạn'}
      footer={
        <>
          {vision && (
            <Button variant="danger" onClick={remove} aria-label="Xóa mục tiêu dài hạn">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {vision ? 'Lưu thay đổi' : 'Thêm'}
          </Button>
        </>
      }
    >
      <VisionFields title={title} setTitle={setTitle} area={area} setArea={setArea} description={description} setDescription={setDescription} />
      {error && <p className="mt-4 rounded-2xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
    </Sheet>
  );
}

export function VisionFields(p: {
  title: string;
  setTitle: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="3–5 năm nữa, bạn muốn điều gì thành sự thật?">
        <textarea className="k-input resize-none" rows={2} maxLength={300} value={p.title} onChange={(e) => p.setTitle(e.target.value)} placeholder="Ví dụ: Du học thạc sĩ và dùng tiếng Anh tự tin" />
      </Field>
      <div className="-mt-2">
        <PhraseHelper
          target="vision"
          text={p.title}
          detail={p.description}
          area={p.area}
          onPick={(o) => {
            p.setTitle(o.title);
            if (o.detail) p.setDescription(o.detail);
          }}
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Thuộc lĩnh vực nào?</span>
        <div className="flex flex-wrap gap-1.5">
          {AREAS.map((a) => (
            <Chip key={a} selected={p.area === a} onClick={() => p.setArea(p.area === a ? '' : a)}>
              {a}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Vì sao điều này quan trọng với bạn? (không bắt buộc)">
        <textarea className="k-input resize-none" rows={2} maxLength={1000} value={p.description} onChange={(e) => p.setDescription(e.target.value)} placeholder="Viết vài dòng cho chính mình" />
      </Field>
    </div>
  );
}
