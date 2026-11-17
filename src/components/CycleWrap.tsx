// Kết thúc chu kỳ 12 tuần: tổng kết ngắn, lưu cây vào Khu vườn kỷ niệm, mở chu kỳ mới.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flower2 } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { diffDays, formatDMY, formatDuration, todayISO } from '@/lib/dates';
import { getActiveCycle } from '@/lib/logic';
import { closeCycle, cycleScore, livePlants, stageNames } from '@/lib/garden';
import { inRange } from '@/lib/focusStats';
import type { Cycle } from '@/lib/types';
import { Button, Card, Sheet } from './ui';
import { GardenScene } from './GardenScene';
import { Plant } from './Plant';

export function CycleWrapSheet({ cycle, open, onClose }: { cycle: Cycle | null; open: boolean; onClose: () => void }) {
  const d = useData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  const info = useMemo(() => {
    if (!cycle || !open) return null;
    const plants = livePlants(d, cycle, today);
    const ids = new Set(d.tasks.filter((t) => plants.some((p) => p.goal.id === t.goal_id)).map((t) => t.id));
    const until = today < cycle.end_date ? today : cycle.end_date;
    const drops = d.task_completions.filter((c) => ids.has(c.task_id) && c.date >= cycle.start_date && c.date <= until).reduce((n, c) => n + c.points, 0);
    const focusMin = inRange(d.focus_sessions, cycle.start_date, until).reduce((n, f) => n + f.actual_sec / 60, 0);
    return { plants, drops, focusMin, score: cycleScore(cycle, d, today) };
  }, [d, cycle, open, today]);

  if (!cycle) return null;
  const daysLeft = diffDays(today, cycle.end_date);
  const early = daysLeft >= 0;

  const finish = async () => {
    if (early && !window.confirm(`Chu kỳ còn ${daysLeft + 1} ngày. Kết thúc sớm và lưu vườn vào Khu vườn kỷ niệm?`)) return;
    setBusy(true);
    const ok = await closeCycle(cycle);
    setBusy(false);
    if (!ok) return;
    onClose();
    useStore.getState().toast('Đã lưu vườn vào Khu vườn kỷ niệm. Giờ hãy đặt 2–3 mục tiêu cho 12 tuần mới nhé.', 'success');
    navigate('/muc-tieu');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={early ? 'Kết thúc chu kỳ sớm' : 'Tổng kết 12 tuần'}
      footer={
        <Button className="flex-1" onClick={finish} disabled={busy}>
          <Flower2 size={18} /> Lưu vào Khu vườn kỷ niệm
        </Button>
      }
    >
      <p className="text-sm text-muted">
        Chu kỳ {formatDMY(cycle.start_date)} – {formatDMY(early ? today : cycle.end_date)}
      </p>
      {info && (
        <>
          <div className="mt-3">
            <GardenScene
              compact
              size={84}
              plants={info.plants.map((p) => ({
                key: p.goal.id,
                species: p.goal.plant,
                stage: p.growth.stage,
                title: p.goal.title,
                sub: `${stageNames(p.goal)[p.growth.stage]} · ${Math.round(p.growth.pct * 100)}%`,
              }))}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface2 px-2 py-2.5">
              <p className="text-xl font-bold tabular-nums">{Math.round(info.score.pct * 100)}%</p>
              <p className="text-[11px] leading-tight text-muted">điểm thực thi trung bình</p>
            </div>
            <div className="rounded-2xl bg-surface2 px-2 py-2.5">
              <p className="text-xl font-bold tabular-nums">{info.drops} 💧</p>
              <p className="text-[11px] leading-tight text-muted">đã tưới cho vườn</p>
            </div>
            <div className="rounded-2xl bg-surface2 px-2 py-2.5">
              <p className="text-xl font-bold tabular-nums">{Math.round(info.focusMin / 60)}g</p>
              <p className="text-[11px] leading-tight text-muted">giờ focus ({formatDuration(info.focusMin)})</p>
            </div>
          </div>
        </>
      )}
      <div className="mt-4 rounded-2xl bg-soft px-3.5 py-3 text-sm leading-relaxed text-ink">
        <p className="font-semibold">Khi bấm lưu:</p>
        <ul className="mt-1 list-disc pl-5">
          <li>Các cây được giữ nguyên ở giai đoạn hiện tại trong Khu vườn kỷ niệm (không héo nữa).</li>
          <li>Mục tiêu 12 tuần và đầu việc của chu kỳ này được cất đi, lịch sử vẫn còn.</li>
          <li>Chu kỳ mới bắt đầu từ thứ Hai tuần này. Mục tiêu dài hạn giữ nguyên để bạn đặt mục tiêu 12 tuần tiếp theo.</li>
        </ul>
      </div>
      {early && <p className="mt-3 text-[13px] text-muted">Thường bạn chỉ cần làm việc này khi hết 12 tuần. Kết thúc sớm phù hợp khi muốn đổi hẳn mục tiêu.</p>}
    </Sheet>
  );
}

/** Thẻ nhắc khi chu kỳ đã hết ngày mà chưa được tổng kết */
export function CycleEndBanner() {
  const cycles = useStore((s) => s.cycles);
  const cycle = getActiveCycle(cycles);
  const [open, setOpen] = useState(false);
  if (!cycle || todayISO() <= cycle.end_date) return null;
  return (
    <>
      <Card className="flex items-center gap-3 border-primary/40 p-4">
        <span className="flex h-16 w-16 shrink-0 items-end justify-center overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
          <Plant species="sen" stage={4} size={60} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">12 tuần đã khép lại 🌸</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">Chu kỳ kết thúc ngày {formatDMY(cycle.end_date)}. Xem tổng kết và lưu vườn vào Khu vườn kỷ niệm.</p>
          <Button size="sm" className="mt-2" onClick={() => setOpen(true)}>
            Tổng kết chu kỳ
          </Button>
        </div>
      </Card>
      <CycleWrapSheet cycle={cycle} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
