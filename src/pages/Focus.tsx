// "Focus": chỗ giữ chỗ ở giai đoạn 1. Đồng hồ, mầm cây lớn dần, âm thanh nền và thống kê sẽ có ở giai đoạn 2.

import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatDuration } from '@/lib/dates';
import { Card, LeverageBadge } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant } from '@/components/Plant';

export default function Focus() {
  const [params] = useSearchParams();
  const tasks = useStore((s) => s.tasks);
  const task = tasks.find((t) => t.id === params.get('viec'));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Focus" subtitle="Tập trung sâu vào một việc, như chăm một mầm cây." />
      <div className="px-4 lg:px-8">
        <Card className="flex flex-col items-center px-6 py-8 text-center">
          <div className="flex h-44 w-44 items-end justify-center rounded-full" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
            <Plant species="tan-tron" stage={1} size={150} sway />
          </div>
          {task && (
            <div className="mt-5 rounded-2xl bg-surface2 px-4 py-3">
              <p className="text-xs font-semibold text-muted">Việc bạn vừa chọn</p>
              <p className="mt-0.5 text-[15px] font-bold">{task.title}</p>
              <p className="mt-1.5 flex items-center justify-center gap-2 text-[13px] text-muted">
                <LeverageBadge leverage={task.leverage} /> {formatDuration(task.estimate_min)}
              </p>
            </div>
          )}
          <p className="mt-5 text-lg font-bold">Chế độ Focus sẽ có ở giai đoạn 2</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
            Đồng hồ đếm ngược 25/50/90 phút, mầm cây lớn dần theo thời gian, âm thanh nền (mưa, gió, chim hót, quán cà phê, tiếng ồn trắng) và thống kê giờ tập trung theo mục tiêu.
          </p>
        </Card>
      </div>
    </div>
  );
}
