// "Vườn" (bản xem trước ở giai đoạn 1): mỗi mục tiêu 12 tuần là một cây lớn theo số 💧 đã nhận.
// Héo/hồi phục, hiệu ứng chuyển giai đoạn và Khu vườn kỷ niệm sẽ có ở giai đoạn 3.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useData } from '@/lib/store';
import { getActiveCycle, goalGrowth, STAGE_NAMES, STAGE_NAMES_TREE } from '@/lib/logic';
import type { Goal } from '@/lib/types';
import { Button, Card, cx, EmptyState, Sheet } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant, plantIsTree, plantName, PLANTS } from '@/components/Plant';

export default function Garden() {
  const d = useData();
  const navigate = useNavigate();
  const cycle = getActiveCycle(d.cycles);
  const [selected, setSelected] = useState<Goal | null>(null);

  const plants = useMemo(
    () =>
      d.goals
        .filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id))
        .sort((a, b) => a.sort - b.sort)
        .map((g) => ({ goal: g, growth: goalGrowth(g, cycle, d) })),
    [d, cycle],
  );
  const sel = selected ? plants.find((p) => p.goal.id === selected.id) : null;
  const names = (g: Goal) => (plantIsTree(g.plant) ? STAGE_NAMES_TREE : STAGE_NAMES);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Vườn" subtitle="Mỗi mục tiêu 12 tuần là một cây. Bạn làm việc, cây lớn lên." />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        {plants.length === 0 ? (
          <Card>
            <EmptyState art={<Plant species="sen" stage={0} size={90} />} title="Vườn chưa có cây nào">
              Thêm một mục tiêu 12 tuần để gieo hạt đầu tiên.
            </EmptyState>
          </Card>
        ) : (
          <div className="relative overflow-hidden rounded-[32px] border border-line" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2) 70%)' }}>
            <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'var(--k-hill-2)' }} />
            <div className="absolute inset-x-0 bottom-12 h-10 rounded-[50%]" style={{ background: 'var(--k-hill-2)' }} />
            <div className="relative flex flex-wrap items-end justify-around gap-x-2 gap-y-6 px-3 pt-10 pb-4">
              {plants.map(({ goal, growth }) => (
                <button key={goal.id} type="button" onClick={() => setSelected(goal)} className="flex w-[30%] min-w-[104px] flex-col items-center transition active:scale-[.97]">
                  <Plant species={goal.plant} stage={growth.stage} size={112} sway />
                  <span className="mt-1 line-clamp-2 rounded-2xl bg-surface/90 px-2.5 py-1 text-center text-xs leading-tight font-semibold text-ink">{goal.title}</span>
                  <span className="mt-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {names(goal)[growth.stage]} · {Math.round(growth.pct * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="p-4">
          <h2 className="text-base font-bold">Cây lớn nhờ đâu?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Mỗi việc bạn tick xong là một lần tưới cây của mục tiêu đó.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-highsoft p-3">
              <p className="flex items-center gap-1 text-sm font-bold text-high">
                <Zap size={15} fill="currentColor" /> Việc 20%
              </p>
              <p className="mt-1 text-2xl leading-none font-bold text-high">+3 💧</p>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">Việc đòn bẩy cao giúp cây lớn nhanh gấp 3.</p>
            </div>
            <div className="rounded-2xl bg-surface2 p-3">
              <p className="text-sm font-bold text-ink">Việc 80%</p>
              <p className="mt-1 text-2xl leading-none font-bold text-ink">+1 💧</p>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">Vẫn cần làm, nhưng cây lớn chậm hơn.</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Đây là bản xem trước. Ở giai đoạn 3, cây sẽ héo dần nếu bị bỏ bê vài ngày, hồi phục khi bạn làm việc trở lại (không bao giờ chết hẳn), và được lưu vào Khu vườn kỷ niệm khi hết 12 tuần.
          </p>
        </Card>
        <Card className="p-4">
          <h2 className="text-base font-bold">Các loài cây và 5 giai đoạn</h2>
          <p className="mt-1 mb-3 text-sm text-muted">Hạt giống → nảy mầm → cây non → ra nụ → nở hoa/trưởng thành.</p>
          <div className="flex flex-col gap-2">
            {PLANTS.map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-[13px] font-semibold text-ink">
                  {p.name} <span className="font-normal text-muted">· {p.note}</span>
                </p>
                <div className="grid grid-cols-5 gap-1.5 rounded-2xl p-1.5" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-end justify-center">
                      <Plant species={p.id} stage={i} size={64} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Sheet open={!!sel} onClose={() => setSelected(null)} title={sel ? sel.goal.title : ''}>
        {sel && (
          <div className="pb-2">
            <div className="flex items-end justify-center rounded-3xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
              <Plant species={sel.goal.plant} stage={sel.growth.stage} size={170} sway />
            </div>
            <p className="mt-3 text-center text-lg font-bold">
              {plantName(sel.goal.plant)} · {names(sel.goal)[sel.growth.stage]}
            </p>
            <p className="text-center text-sm text-muted">
              Đã nhận {sel.growth.earned}/{sel.growth.total} 💧 của cả chu kỳ ({Math.round(sel.growth.pct * 100)}%)
            </p>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {names(sel.goal).map((n, i) => (
                <div key={n} className={cx('flex flex-col items-center rounded-2xl border-2 pb-1.5', i === sel.growth.stage ? 'border-primary bg-soft' : 'border-transparent bg-surface2', i > sel.growth.stage && 'opacity-55')}>
                  <Plant species={sel.goal.plant} stage={i} size={52} />
                  <span className="px-0.5 text-center text-[10.5px] leading-tight font-semibold text-ink">{n}</span>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" variant="soft" onClick={() => navigate('/muc-tieu')}>
              Xem đầu việc của mục tiêu này
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
