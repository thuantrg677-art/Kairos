// Bảng trộn âm thanh nền: bật/tắt từng âm, chỉnh âm lượng riêng và âm lượng tổng.

import { Pause, Play, Volume1, Volume2 } from 'lucide-react';
import { SOUNDS, unlockAudio, useSound } from '@/lib/sound';
import { Button, Card, cx } from './ui';

export function SoundMixer() {
  const { mix, master, playing, supported, toggle, setVolume, setMaster, play, stop } = useSound();
  const anyOn = Object.values(mix).some((c) => c.on);

  if (!supported) {
    return (
      <Card className="p-4">
        <h2 className="text-base font-bold">Âm thanh nền</h2>
        <p className="mt-1 text-sm text-muted">Trình duyệt này chưa hỗ trợ phát âm thanh nền.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Âm thanh nền</h2>
          <p className="text-[13px] text-muted">Trộn nhiều âm với nhau. Tự phát khi bắt đầu focus.</p>
        </div>
        <Button
          size="sm"
          variant={playing ? 'soft' : 'primary'}
          disabled={!anyOn}
          onClick={() => {
            unlockAudio();
            if (playing) stop();
            else play();
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? 'Tắt' : 'Nghe'}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {SOUNDS.map((s) => {
          const ch = mix[s.id];
          return (
            <div key={s.id} className="flex items-center gap-3">
              <button
                type="button"
                aria-pressed={ch.on}
                onClick={() => {
                  unlockAudio();
                  toggle(s.id);
                }}
                className={cx(
                  'flex min-h-11 w-36 shrink-0 items-center gap-2 rounded-2xl px-3 text-left text-sm font-semibold transition active:scale-[.98]',
                  ch.on ? 'bg-soft text-ink' : 'text-muted hover:bg-surface2',
                )}
              >
                <span aria-hidden className={cx('text-lg', !ch.on && 'opacity-50 grayscale')}>
                  {s.emoji}
                </span>
                {s.name}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ch.vol}
                onChange={(e) => setVolume(s.id, Number(e.target.value))}
                disabled={!ch.on}
                aria-label={`Âm lượng ${s.name}`}
                className="k-range flex-1"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
        <span className="flex w-36 shrink-0 items-center gap-2 px-3 text-sm font-semibold">
          {master < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />} Âm lượng chung
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={master}
          onChange={(e) => setMaster(Number(e.target.value))}
          aria-label="Âm lượng chung"
          className="k-range flex-1"
        />
      </div>
      <p className="mt-2 text-xs text-muted">Trên iPhone, âm thanh có thể tắt khi khóa màn hình hoặc chuyển sang app khác.</p>
    </Card>
  );
}
