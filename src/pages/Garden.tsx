// "Vườn": mỗi mục tiêu 12 tuần là một cây lớn theo số 💧 đã nhận.
// Cây héo dần nếu bị bỏ bê (3 ngày hơi héo, 7 ngày héo rõ), tươi lại ngay khi được tưới, không bao giờ chết hẳn.
// Hết 12 tuần, cả khu vườn được lưu vào Khu vườn kỷ niệm.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Droplets, Zap } from 'lucide-react';
import { useData } from '@/lib/store';
import { diffDays, formatDM, formatDMY, todayISO } from '@/lib/dates';
import { getActiveCycle } from '@/lib/logic';
import { describeHealth, livePlants, memorialPlants, pastCycles, plantEvents, readSeen, stageNames, WILT_DAYS, writeSeen, type MemorialPlant, type PlantEvent, type PlantState } from '@/lib/garden';
import type { Cycle } from '@/lib/types';
import { Button, Card, cx, EmptyState, Sheet } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant, plantName, PLANTS } from '@/components/Plant';
import { GardenScene } from '@/components/GardenScene';
import { CycleEndBanner, CycleWrapSheet } from '@/components/CycleWrap';

function lastWateredText(last: string | null, today: string): string {
  if (!last) return 'Chưa được tưới lần nào';
  if (last === today) return 'Đã tưới hôm nay';
  const n = diffDays(last, today);
  return n === 1 ? `Tưới lần cuối hôm qua (${formatDM(last)})` : `Tưới lần cuối ${n} ngày trước (${formatDM(last)})`;
}

export default function Garden() {
  const d = useData();
  const navigate = useNavigate();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const [selected, setSelected] = useState<string | null>(null);
  const [memorial, setMemorial] = useState<{ cycle: Cycle; plant: MemorialPlant } | null>(null);
  const [wrap, setWrap] = useState(false);
  const [showSpecies, setShowSpecies] = useState(false);

  const plants = useMemo(() => livePlants(d, cycle, today), [d, cycle, today]);
  const past = useMemo(() => pastCycles(d.cycles).map((c) => ({ cycle: c, plants: memorialPlants(c, d) })), [d]);

  // Hiệu ứng: so với lần xem trước, cây nào vừa lên giai đoạn / vừa tươi lại. Xem xong thì ghi nhớ trạng thái mới.
  const [events, setEvents] = useState<Map<string, PlantEvent>>(new Map());
  useEffect(() => {
    setEvents(plantEvents(plants, readSeen()));
    writeSeen(plants);
    // Chỉ chạy khi mở trang hoặc khi trạng thái cây thực sự đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants.map((p) => `${p.goal.id}:${p.growth.stage}:${p.health.wilt}`).join('|')]);

  const sel = selected ? plants.find((p) => p.goal.id === selected) ?? null : null;
  const thirsty = plants.filter((p) => p.health.wilt > 0).sort((a, b) => b.health.dryDays - a.health.dryDays);
  const started = !!cycle && today >= cycle.start_date;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Vườn" subtitle="Mỗi mục tiêu 12 tuần là một cây. Bạn làm việc, cây lớn lên." />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <CycleEndBanner />

        {plants.length === 0 ? (
          <Card>
            <EmptyState art={<Plant species="sen" stage={0} size={90} />} title="Vườn chưa có cây nào">
              Thêm một mục tiêu 12 tuần để gieo hạt đầu tiên.
            </EmptyState>
            <div className="flex justify-center pb-6">
              <Button variant="soft" onClick={() => navigate('/muc-tieu')}>
                Đặt mục tiêu 12 tuần
              </Button>
            </div>
          </Card>
        ) : (
          <GardenScene
            plants={plants.map((p) => ({
              key: p.goal.id,
              species: p.goal.plant,
              stage: p.growth.stage,
              wilt: p.health.wilt,
              title: p.goal.title,
              sub: `${stageNames(p.goal)[p.growth.stage]} · ${Math.round(p.growth.pct * 100)}%`,
              badge: p.health.wilt > 0 && (
                <span className={cx('mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', p.health.wilt === 2 ? 'bg-danger text-white dark:text-black' : 'bg-highsoft text-high')}>
                  {p.health.wilt === 2 ? 'Héo rõ' : 'Hơi héo'} · {p.health.dryDays} ngày
                </span>
              ),
              event: events.get(p.goal.id),
              onClick: () => setSelected(p.goal.id),
            }))}
          />
        )}

        {[...events.values()].includes('grew') && (
          <p className="k-fade-in rounded-2xl bg-soft px-4 py-3 text-sm font-medium text-ink">✨ Có cây vừa lên giai đoạn mới kể từ lần trước bạn ghé vườn. Giỏi lắm!</p>
        )}

        {thirsty.length > 0 && (
          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 text-base font-bold">
              <Droplets size={18} className="text-water" /> Cây đang khát
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">Tick một việc của mục tiêu là cây tươi lại ngay.</p>
            <div className="mt-3 flex flex-col gap-2">
              {thirsty.map((p) => (
                <button key={p.goal.id} type="button" onClick={() => setSelected(p.goal.id)} className="flex items-center gap-3 rounded-2xl bg-surface2 p-2 text-left">
                  <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
                    <Plant species={p.goal.plant} stage={p.growth.stage} wilt={p.health.wilt} size={44} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.goal.title}</span>
                    <span className={cx('text-xs font-medium', p.health.wilt === 2 ? 'text-danger' : 'text-high')}>{describeHealth(p.health)}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button size="sm" variant="soft" className="mt-3" onClick={() => navigate('/')}>
              Mở việc hôm nay
            </Button>
          </Card>
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
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map((w) => (
              <div key={w} className="flex flex-col items-center rounded-2xl bg-surface2 pb-2">
                <Plant species="tan-tron" stage={3} wilt={w} size={64} />
                <span className="px-1 text-center text-[11.5px] leading-tight font-semibold">
                  {w === 0 ? 'Tươi tốt' : w === 1 ? `${WILT_DAYS[0]} ngày chưa tưới: hơi héo` : `${WILT_DAYS[1]} ngày: héo rõ`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Cây không bao giờ chết hẳn: chỉ cần làm lại một việc là tươi trở lại. Hết 12 tuần, cả khu vườn được lưu vào <b>Khu vườn kỷ niệm</b> bên dưới.
          </p>
        </Card>

        {/* Khu vườn kỷ niệm */}
        <section className="mt-2">
          <h2 className="text-lg font-bold">Khu vườn kỷ niệm</h2>
          <p className="mb-3 text-sm text-muted">Những khu vườn bạn đã trồng qua từng chu kỳ 12 tuần.</p>
          {past.length === 0 ? (
            <Card>
              <EmptyState art={<Plant species="linh-lan" stage={4} size={80} />} title="Chưa có khu vườn nào">
                Hết chu kỳ 12 tuần, khu vườn hiện tại sẽ được lưu ở đây, giữ nguyên cây ở giai đoạn cuối cùng.
              </EmptyState>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {past.map(({ cycle: c, plants: ps }) => (
                <div key={c.id}>
                  <p className="mb-1.5 text-sm font-semibold text-ink">
                    {formatDMY(c.start_date)} – {formatDMY(c.end_date)}
                    <span className="font-normal text-muted"> · {ps.length} cây</span>
                  </p>
                  {ps.length === 0 ? (
                    <p className="text-sm text-muted">Chu kỳ này không có mục tiêu nào.</p>
                  ) : (
                    <GardenScene
                      compact
                      size={84}
                      plants={ps.map((p) => ({
                        key: p.goal.id,
                        species: p.goal.plant,
                        stage: p.stage,
                        title: p.goal.title,
                        sub: `${stageNames(p.goal)[p.stage]} · ${Math.round(p.pct * 100)}%`,
                        onClick: () => setMemorial({ cycle: c, plant: p }),
                      }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Card className="p-4">
          <button type="button" onClick={() => setShowSpecies((v) => !v)} aria-expanded={showSpecies} className="flex min-h-9 w-full items-center justify-between text-left">
            <span>
              <span className="block text-base font-bold">Các loài cây và 5 giai đoạn</span>
              <span className="text-sm text-muted">Hạt giống → nảy mầm → cây non → ra nụ → nở hoa/trưởng thành.</span>
            </span>
            <ChevronDown size={20} className={cx('shrink-0 text-muted transition-transform', showSpecies && 'rotate-180')} />
          </button>
          {showSpecies && (
            <div className="k-fade-in mt-3 flex flex-col gap-2">
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
          )}
        </Card>

        {started && cycle && today <= cycle.end_date && (
          <div className="pb-2 text-center">
            <Button variant="ghost" size="sm" className="text-muted" onClick={() => setWrap(true)}>
              Kết thúc chu kỳ sớm…
            </Button>
          </div>
        )}
      </div>

      <PlantSheet plant={sel} today={today} onClose={() => setSelected(null)} onGoals={() => navigate('/muc-tieu')} />

      <Sheet open={!!memorial} onClose={() => setMemorial(null)} title={memorial ? memorial.plant.goal.title : ''}>
        {memorial && (
          <div className="pb-2">
            <div className="flex items-end justify-center rounded-3xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
              <Plant species={memorial.plant.goal.plant} stage={memorial.plant.stage} size={160} sway />
            </div>
            <p className="mt-3 text-center text-lg font-bold">
              {plantName(memorial.plant.goal.plant)} · {stageNames(memorial.plant.goal)[memorial.plant.stage]}
            </p>
            <p className="text-center text-sm text-muted">
              Chu kỳ {formatDMY(memorial.cycle.start_date)} – {formatDMY(memorial.cycle.end_date)}
            </p>
            <p className="mt-1 text-center text-sm text-muted">
              Đã nhận {memorial.plant.earned}/{memorial.plant.total} 💧 ({Math.round(memorial.plant.pct * 100)}%)
            </p>
            {memorial.plant.goal.measure && <p className="mt-3 rounded-2xl bg-surface2 px-3 py-2 text-sm">Đo bằng: {memorial.plant.goal.measure}</p>}
            {(() => {
              const v = d.visions.find((x) => x.id === memorial.plant.goal.vision_id);
              return v ? <p className="mt-2 text-sm text-muted">Phục vụ mục tiêu dài hạn: {v.title}</p> : null;
            })()}
          </div>
        )}
      </Sheet>

      <CycleWrapSheet cycle={cycle} open={wrap} onClose={() => setWrap(false)} />
    </div>
  );
}

function PlantSheet({ plant, today, onClose, onGoals }: { plant: PlantState | null; today: string; onClose: () => void; onGoals: () => void }) {
  const names = plant ? stageNames(plant.goal) : [];
  return (
    <Sheet open={!!plant} onClose={onClose} title={plant ? plant.goal.title : ''}>
      {plant && (
        <div className="pb-2">
          <div className="flex items-end justify-center rounded-3xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
            <Plant species={plant.goal.plant} stage={plant.growth.stage} wilt={plant.health.wilt} size={170} sway />
          </div>
          <p className="mt-3 text-center text-lg font-bold">
            {plantName(plant.goal.plant)} · {names[plant.growth.stage]}
          </p>
          <p className="text-center text-sm text-muted">
            Đã nhận {plant.growth.earned}/{plant.growth.total} 💧 của cả chu kỳ ({Math.round(plant.growth.pct * 100)}%)
          </p>
          <div
            className={cx(
              'mt-3 rounded-2xl px-3.5 py-2.5 text-sm leading-snug',
              plant.health.wilt === 2 ? 'bg-danger/10 text-danger' : plant.health.wilt === 1 ? 'bg-highsoft text-high' : 'bg-soft text-ink',
            )}
          >
            <p className="font-semibold">{describeHealth(plant.health)}</p>
            <p className={plant.health.wilt ? '' : 'text-muted'}>
              {lastWateredText(plant.health.lastWatered, today)}.
              {plant.health.wilt > 0 && ' Tick một việc của mục tiêu này để cây tươi lại.'}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {names.map((n, i) => (
              <div key={n} className={cx('flex flex-col items-center rounded-2xl border-2 pb-1.5', i === plant.growth.stage ? 'border-primary bg-soft' : 'border-transparent bg-surface2', i > plant.growth.stage && 'opacity-55')}>
                <Plant species={plant.goal.plant} stage={i} size={52} />
                <span className="px-0.5 text-center text-[10.5px] leading-tight font-semibold text-ink">{n}</span>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="soft" onClick={onGoals}>
            Xem đầu việc của mục tiêu này
          </Button>
        </div>
      )}
    </Sheet>
  );
}
