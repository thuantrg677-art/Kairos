// Khởi đầu (onboarding), đúng thứ tự:
// 1. Mục tiêu dài hạn → 2. Mục tiêu 12 tuần → 3. Lịch cố định → 4. Chọn cây + giao diện.

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData, useStore } from '@/lib/store';
import { addDays, formatDM, formatDMY, mondayOf, todayISO } from '@/lib/dates';
import { CYCLE_DAYS, getActiveCycle } from '@/lib/logic';
import { isDark } from '@/lib/themes';
import type { Goal } from '@/lib/types';
import { Button, Card, cx } from '@/components/ui';
import { LogoMark } from '@/components/Logo';
import { GoalEditor, VisionFields } from '@/components/Editors';
import { FixedScheduleEditor } from '@/components/FixedScheduleEditor';
import { DarkModePicker, PlantBadge, PlantPicker, Segmented, ThemePicker } from '@/components/pickers';

const STEPS = ['Mục tiêu dài hạn', 'Mục tiêu 12 tuần', 'Lịch cố định', 'Cây và giao diện'];
const PROMPTS = ['3 năm nữa bạn muốn mình trở thành ai?', 'Lĩnh vực nào quan trọng nhất với bạn lúc này?', 'Điều gì khiến bạn tự hào nhất nếu làm được?'];

export default function Onboarding() {
  const d = useData();
  const navigate = useNavigate();
  const st = useStore.getState();
  const cycle = getActiveCycle(d.cycles);
  const goals = useMemo(() => d.goals.filter((g) => cycle && g.cycle_id === cycle.id), [d.goals, cycle]);
  // Nếu thoát giữa chừng rồi quay lại thì tiếp tục ở bước còn dở
  const [step, setStep] = useState(() => (d.visions.length === 0 ? 0 : goals.length === 0 ? 1 : 2));

  // ----- Bước 1 -----
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const addVision = () => {
    if (!title.trim()) return false;
    const row = st.insert('visions', { title: title.trim(), area, description: description.trim(), sort: d.visions.length });
    if (!row) return false;
    setTitle('');
    setArea('');
    setDescription('');
    return true;
  };

  // ----- Bước 2 -----
  const thisMonday = mondayOf(todayISO());
  const [goalOpen, setGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const ensureCycle = (start: string) => {
    const end = addDays(start, CYCLE_DAYS - 1);
    if (!cycle) st.insert('cycles', { start_date: start, end_date: end, status: 'active' });
    else if (cycle.start_date !== start) {
      st.update('cycles', cycle.id, { start_date: start, end_date: end });
      // Mục tiêu nào có hạn nằm ngoài chu kỳ mới thì kéo về ngày cuối chu kỳ
      goals.forEach((g) => (g.due_date > end || g.due_date < start) && st.update('goals', g.id, { due_date: end }));
    }
  };

  // Quay lại app ở bước 2 mà chưa có chu kỳ thì tạo chu kỳ bắt đầu từ thứ Hai tuần này
  useEffect(() => {
    if (step >= 1 && !cycle) ensureCycle(thisMonday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cycle?.id]);

  const next = () => {
    if (step === 0) {
      if (title.trim()) addVision();
      else if (d.visions.length === 0) return st.toast('Hãy viết ít nhất một mục tiêu dài hạn để bắt đầu.');
      if (!cycle) ensureCycle(thisMonday);
    }
    if (step === 1 && goals.length === 0) return st.toast('Hãy thêm ít nhất một mục tiêu cho 12 tuần.');
    if (step === 3) {
      st.updateProfile({ onboarded_at: new Date().toISOString() });
      navigate('/', { replace: true });
      return;
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const profile = d.profile!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <header className="safe-top">
        <div className="flex items-center justify-between pt-4">
          <span className="flex items-center gap-2">
            <LogoMark size={34} />
            <span className="text-lg font-bold tracking-tight">kairos</span>
          </span>
          <button className="min-h-11 text-sm text-muted" onClick={() => void st.signOut()}>
            Thoát
          </button>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-line')} />
          ))}
        </div>
        <p className="mt-2 text-[13px] font-semibold text-muted">
          Bước {step + 1}/4 · {STEPS[step]}
        </p>
      </header>

      <main className="k-fade-in flex-1 py-4" key={step}>
        {step === 0 && (
          <>
            <h1 className="text-2xl leading-tight font-bold">Bắt đầu từ đích đến xa</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">Trước khi lập kế hoạch 12 tuần, hãy nghĩ về 3–5 năm tới. Mọi việc nhỏ sau này đều sẽ nối về đây.</p>
            <div className="mt-4 flex flex-col gap-1.5">
              {PROMPTS.map((p) => (
                <p key={p} className="rounded-2xl bg-surface2 px-3.5 py-2.5 text-sm text-ink">
                  💭 {p}
                </p>
              ))}
            </div>

            {d.visions.length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                {d.visions.map((v) => (
                  <Card key={v.id} className="flex items-start gap-2 p-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-onprimary">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{v.title}</p>
                      {v.area && <p className="text-[13px] text-muted">{v.area}</p>}
                    </div>
                    <button
                      aria-label={`Xóa: ${v.title}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted"
                      onClick={() => (d.goals.some((g) => g.vision_id === v.id) ? st.toast('Mục tiêu này đang có mục tiêu 12 tuần gắn vào nên chưa xóa được.') : st.remove('visions', v.id))}
                    >
                      <X size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            )}

            <Card className="mt-5 p-4">
              <VisionFields title={title} setTitle={setTitle} area={area} setArea={setArea} description={description} setDescription={setDescription} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="soft" onClick={addVision} disabled={!title.trim()}>
                  <Plus size={18} /> {d.visions.length ? 'Thêm mục tiêu dài hạn nữa' : 'Thêm mục tiêu dài hạn'}
                </Button>
                <Button variant="ghost" disabled title="Có ở giai đoạn 2">
                  <Sparkles size={18} /> AI giúp diễn đạt (sắp có)
                </Button>
              </div>
            </Card>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl leading-tight font-bold">12 tuần tới, bạn tập trung vào đâu?</h1>
            <p className="mt-3 rounded-2xl bg-highsoft px-4 py-3 text-[15px] leading-snug font-semibold text-high">Chỉ nên đặt 2–3 mục tiêu cho 12 tuần. Ít mục tiêu thì mới làm đến nơi đến chốn.</p>

            <div className="mt-4">
              <span className="mb-1.5 block text-sm font-semibold">Chu kỳ 12 tuần bắt đầu từ</span>
              <Segmented
                value={cycle?.start_date === addDays(thisMonday, 7) ? 'next' : 'this'}
                onChange={(v) => ensureCycle(v === 'next' ? addDays(thisMonday, 7) : thisMonday)}
                options={[
                  { id: 'this', label: `Tuần này (${formatDM(thisMonday)})` },
                  { id: 'next', label: `Tuần sau (${formatDM(addDays(thisMonday, 7))})` },
                ]}
              />
              {cycle && <p className="mt-1.5 text-[13px] text-muted">Kết thúc vào Chủ nhật {formatDMY(cycle.end_date)}.</p>}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {goals.map((g, i) => (
                <Card key={g.id} className="flex items-start gap-3 p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{g.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">
                      → {d.visions.find((v) => v.id === g.vision_id)?.title}
                      <br />
                      {g.measure ? `Đo bằng: ${g.measure} · ` : ''}Hạn {formatDMY(g.due_date)}
                    </p>
                  </div>
                  <button aria-label={`Sửa: ${g.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted" onClick={() => setEditGoal(g)}>
                    <Pencil size={17} />
                  </button>
                </Card>
              ))}
            </div>
            <Button variant={goals.length ? 'soft' : 'primary'} className="mt-3 w-full" onClick={() => setGoalOpen(true)}>
              <Plus size={18} /> {goals.length ? `Thêm mục tiêu thứ ${goals.length + 1}` : 'Thêm mục tiêu 12 tuần đầu tiên'}
            </Button>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">Mỗi mục tiêu phải gắn với một mục tiêu dài hạn, đo được và có ngày hoàn thành. Ở giai đoạn 2, AI sẽ nhận xét mức độ liên kết này.</p>
            <GoalEditor open={goalOpen} onClose={() => setGoalOpen(false)} hidePlant />
            <GoalEditor open={!!editGoal} onClose={() => setEditGoal(null)} goal={editGoal} hidePlant />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl leading-tight font-bold">Tuần của bạn đã kín những lúc nào?</h1>
            <p className="mt-1.5 mb-4 text-[15px] leading-relaxed text-muted">Nhập lịch học, lịch làm và những việc lặp lại theo thứ. Phần còn lại là khung trống để Kairos xếp việc quan trọng vào.</p>
            <FixedScheduleEditor />
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl leading-tight font-bold">Gieo hạt cho khu vườn của bạn</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Mỗi mục tiêu là một cây. Làm xong việc là tưới cây: <b className="text-high">việc 20% tưới +3 💧</b>, việc 80% tưới +1 💧.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {goals.map((g) => (
                <Card key={g.id} className="p-3.5">
                  <div className="mb-2.5 flex items-center gap-3">
                    <PlantBadge species={g.plant} stage={4} size={44} />
                    <p className="text-[15px] font-semibold">{g.title}</p>
                  </div>
                  <PlantPicker value={g.plant} onChange={(plant) => st.update('goals', g.id, { plant })} />
                </Card>
              ))}
            </div>
            <h2 className="mt-6 mb-2 text-lg font-bold">Chọn giao diện</h2>
            <ThemePicker value={profile.theme} dark={isDark(profile.dark_mode)} onChange={(theme) => st.updateProfile({ theme })} />
            <div className="mt-3">
              <DarkModePicker value={profile.dark_mode} onChange={(dark_mode) => st.updateProfile({ dark_mode })} />
            </div>
          </>
        )}
      </main>

      <footer className="safe-bottom sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-bg/95 px-5 pt-3 backdrop-blur">
        <div className="flex w-full gap-2 pb-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} aria-label="Quay lại">
              <ArrowLeft size={18} />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={next}>
            {step === 3 ? 'Bắt đầu dùng Kairos' : step === 2 && d.fixed_events.length === 0 ? 'Bỏ qua bước này' : 'Tiếp tục'}
            {step < 3 && <ArrowRight size={18} />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
