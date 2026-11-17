// Âm thanh nền cho Focus, tạo hoàn toàn bằng Web Audio (không cần file âm thanh, chạy cả khi offline).
// Mỗi âm là một "kênh" có âm lượng riêng; các kênh trộn vào một âm lượng tổng.
// Trình duyệt chỉ cho phát âm thanh sau một cú chạm/nhấn của người dùng, nên luôn gọi unlockAudio() trong sự kiện bấm nút.

import { create } from 'zustand';

export type SoundId = 'rain' | 'wind' | 'birds' | 'cafe' | 'white';

export const SOUNDS: { id: SoundId; name: string; emoji: string }[] = [
  { id: 'rain', name: 'Mưa', emoji: '🌧️' },
  { id: 'wind', name: 'Gió', emoji: '🍃' },
  { id: 'birds', name: 'Chim hót', emoji: '🐦' },
  { id: 'cafe', name: 'Quán cà phê', emoji: '☕' },
  { id: 'white', name: 'Ồn trắng', emoji: '〰️' },
];

type Channel = { on: boolean; vol: number };
type Mix = Record<SoundId, Channel>;

const MIX_KEY = 'kairos-sound-v1';
const DEFAULT_MIX: Mix = {
  rain: { on: true, vol: 0.6 },
  wind: { on: false, vol: 0.5 },
  birds: { on: false, vol: 0.5 },
  cafe: { on: false, vol: 0.5 },
  white: { on: false, vol: 0.4 },
};

// ------------------------------------------------------------
// Bộ máy âm thanh
// ------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const live = new Map<SoundId, { gain: GainNode; stop: () => void }>();
const buffers: Partial<Record<'white' | 'pink' | 'brown', AudioBuffer>> = {};

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  // Bộ nén nhẹ: trộn nhiều âm cùng lúc cũng không bị rè
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  return ctx;
}

/** Gọi trong sự kiện bấm nút để trình duyệt cho phép phát âm thanh về sau (kể cả tiếng chuông hết giờ) */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state !== 'running') void c.resume();
}

/** Bộ đệm nhiễu 2 kênh dài 6 giây, phát lặp lại */
function noise(kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const c = ctx!;
  if (buffers[kind]) return buffers[kind]!;
  const len = c.sampleRate * 6;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else if (kind === 'pink') {
        // Bộ lọc nhiễu hồng của Paul Kellet
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Làm mềm chỗ nối đầu–cuối để vòng lặp không bị "tách"
    const fade = 2048;
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
    }
  }
  buffers[kind] = buf;
  return buf;
}

function loop(kind: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
  const src = ctx!.createBufferSource();
  src.buffer = noise(kind);
  src.loop = true;
  src.loopStart = Math.random() * 2;
  src.start(0, Math.random() * 4);
  return src;
}

function filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx!.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gainNode(v: number): GainNode {
  const g = ctx!.createGain();
  g.gain.value = v;
  return g;
}

/** Dao động chậm (LFO) cộng vào một tham số: param dao động quanh giá trị gốc ± depth */
function lfo(rate: number, depth: number, param: AudioParam): OscillatorNode {
  const o = ctx!.createOscillator();
  o.frequency.value = rate;
  const g = gainNode(depth);
  o.connect(g).connect(param);
  o.start();
  return o;
}

/**
 * Lên lịch các âm lẻ (giọt mưa, tiếng chim, tiếng ly tách) trước 1,5 giây.
 * Nhờ vậy khi trình duyệt làm chậm bộ hẹn giờ (tab ở nền) âm vẫn liền mạch.
 */
function scheduler(gap: () => number, fire: (t: number) => void): () => void {
  let next = ctx!.currentTime + 0.3;
  const run = () => {
    const horizon = ctx!.currentTime + 1.5;
    while (next < horizon) {
      fire(next);
      next += gap();
    }
  };
  run();
  const timer = setInterval(run, 400);
  return () => clearInterval(timer);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Nút chỉnh trái/phải dùng cho một âm lẻ; tự gỡ khỏi mạch sau `life` giây */
function pan(out: AudioNode, value: number, life: number): AudioNode {
  if (!ctx!.createStereoPanner) return out;
  const p = ctx!.createStereoPanner();
  p.pan.value = value;
  p.connect(out);
  setTimeout(() => p.disconnect(), life * 1000);
  return p;
}

type Built = { stop: () => void };

const BUILDERS: Record<SoundId, (out: GainNode) => Built> = {
  white(out) {
    const src = loop('white');
    src.connect(filter('lowpass', 9000)).connect(gainNode(0.32)).connect(out);
    return { stop: () => src.stop() };
  },

  rain(out) {
    // Nền mưa rào: nhiễu hồng lọc bớt âm trầm và âm quá chói
    const bed = loop('pink');
    const bedGain = gainNode(0.75);
    bed.connect(filter('highpass', 500)).connect(filter('lowpass', 6500)).connect(bedGain).connect(out);
    const swell = lfo(0.09, 0.12, bedGain.gain);
    // Giọt mưa rơi lộp độp
    const drip = loop('white');
    const dripBus = gainNode(1);
    drip.connect(dripBus);
    const stopDrops = scheduler(
      () => rnd(0.02, 0.14),
      (t) => {
        const f = filter('bandpass', rnd(1800, 6000), rnd(4, 9));
        const g = gainNode(0);
        dripBus.connect(f).connect(g).connect(pan(out, rnd(-0.8, 0.8), t - ctx!.currentTime + 0.4));
        const peak = rnd(0.15, 0.6);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + rnd(0.03, 0.09));
        setTimeout(() => {
          dripBus.disconnect(f);
          f.disconnect();
        }, (t - ctx!.currentTime + 0.3) * 1000);
      },
    );
    return {
      stop: () => {
        stopDrops();
        bed.stop();
        drip.stop();
        swell.stop();
      },
    };
  },

  wind(out) {
    const src = loop('brown');
    const bp = filter('bandpass', 420, 0.9);
    const g = gainNode(0.55);
    src.connect(bp).connect(g).connect(out);
    const o1 = lfo(0.06, 260, bp.frequency);
    const o2 = lfo(0.11, 0.3, g.gain);
    const o3 = lfo(0.023, 0.18, g.gain);
    // Lớp gió rít nhẹ phía trên
    const hiss = loop('pink');
    const hp = filter('bandpass', 1800, 1.4);
    const hg = gainNode(0.08);
    hiss.connect(hp).connect(hg).connect(out);
    const o4 = lfo(0.08, 700, hp.frequency);
    const o5 = lfo(0.13, 0.06, hg.gain);
    return { stop: () => [src, hiss, o1, o2, o3, o4, o5].forEach((n) => n.stop()) };
  },

  birds(out) {
    // Nền lá xào xạc rất khẽ
    const leaves = loop('pink');
    const lg = gainNode(0.05);
    leaves.connect(filter('highpass', 2500)).connect(lg).connect(out);
    const rustle = lfo(0.2, 0.03, lg.gain);
    const stop = scheduler(
      () => rnd(0.9, 4.2),
      (t) => {
        // Một "câu hót" gồm 2–6 tiếng ríu rít
        const base = rnd(2300, 4300);
        const notes = 2 + Math.floor(Math.random() * 5);
        const dest = pan(out, rnd(-0.9, 0.9), t - ctx!.currentTime + 2);
        const style = Math.random();
        let at = t;
        for (let i = 0; i < notes; i++) {
          const o = ctx!.createOscillator();
          const g = gainNode(0);
          o.type = 'sine';
          const dur = rnd(0.05, 0.14);
          const f0 = base * rnd(0.85, 1.15);
          o.frequency.setValueAtTime(f0, at);
          if (style < 0.5) o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.25, 1.6), at + dur);
          else o.frequency.exponentialRampToValueAtTime(f0 * rnd(0.6, 0.8), at + dur);
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(rnd(0.05, 0.13), at + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
          o.connect(g).connect(dest);
          o.start(at);
          o.stop(at + dur + 0.02);
          at += dur + rnd(0.03, 0.12);
        }
      },
    );
    return {
      stop: () => {
        stop();
        leaves.stop();
        rustle.stop();
      },
    };
  },

  cafe(out) {
    // Tiếng người nói lao xao: nhiễu lọc quanh dải giọng nói, đổi "khẩu hình" liên tục
    const src = loop('pink');
    const v1 = filter('bandpass', 500, 2.2);
    const v2 = filter('bandpass', 1200, 2.5);
    const g1 = gainNode(0.5);
    const g2 = gainNode(0.25);
    src.connect(v1).connect(g1).connect(out);
    src.connect(v2).connect(g2).connect(out);
    const room = loop('brown');
    room.connect(filter('lowpass', 300)).connect(gainNode(0.35)).connect(out);
    const stopBabble = scheduler(
      () => rnd(0.12, 0.3),
      (t) => {
        v1.frequency.setTargetAtTime(rnd(320, 800), t, 0.06);
        v2.frequency.setTargetAtTime(rnd(900, 2000), t, 0.06);
        g1.gain.setTargetAtTime(rnd(0.3, 0.6), t, 0.08);
        g2.gain.setTargetAtTime(rnd(0.1, 0.3), t, 0.08);
      },
    );
    // Thỉnh thoảng có tiếng ly tách, muỗng chạm nhau
    const stopClinks = scheduler(
      () => rnd(1.5, 6),
      (t) => {
        const dest = pan(out, rnd(-0.7, 0.7), t - ctx!.currentTime + 1);
        const f = rnd(1800, 3400);
        for (const [mult, vol] of [
          [1, 0.05],
          [2.76, 0.025],
          [5.4, 0.012],
        ]) {
          const o = ctx!.createOscillator();
          const g = gainNode(0);
          o.frequency.value = f * mult;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(vol, t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0005, t + rnd(0.2, 0.45));
          o.connect(g).connect(dest);
          o.start(t);
          o.stop(t + 0.5);
        }
      },
    );
    return {
      stop: () => {
        stopBabble();
        stopClinks();
        src.stop();
        room.stop();
      },
    };
  },
};

/** Hệ số cân bằng để các âm nghe to ngang nhau ở cùng một mức thanh trượt (đã đo bằng máy) */
const LEVEL: Record<SoundId, number> = { rain: 2.8, wind: 4, birds: 5, cafe: 3, white: 3.2 };
/** Âm lượng kênh theo thang tai người nghe (bình phương cho đều tay hơn) */
const curve = (v: number) => v * v;

function startChannel(id: SoundId, vol: number) {
  if (!ctx || !master || live.has(id)) return;
  const gain = gainNode(0);
  gain.connect(master);
  const built = BUILDERS[id](gain);
  gain.gain.setTargetAtTime(curve(vol) * LEVEL[id], ctx.currentTime, 0.4);
  live.set(id, { gain, stop: built.stop });
}

function stopChannel(id: SoundId) {
  const ch = live.get(id);
  if (!ch || !ctx) return;
  live.delete(id);
  ch.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  setTimeout(() => {
    try {
      ch.stop();
    } catch {
      /* đã dừng */
    }
    ch.gain.disconnect();
  }, 1500);
}

/** Tiếng chuông báo hết giờ: 3 nốt nhẹ (soft = 2 nốt, dùng khi hết giờ nghỉ) */
export function chime(soft = false) {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  const notes = soft ? [659.25, 523.25] : [523.25, 659.25, 783.99];
  const t0 = c.currentTime + 0.05;
  notes.forEach((f, i) => {
    const t = t0 + i * 0.22;
    for (const [mult, vol] of [
      [1, 0.22],
      [2, 0.06],
    ]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 1.7);
    }
  });
}

// ------------------------------------------------------------
// Trạng thái cho giao diện
// ------------------------------------------------------------

interface SoundState {
  mix: Mix;
  master: number;
  playing: boolean;
  supported: boolean;
  toggle: (id: SoundId) => void;
  setVolume: (id: SoundId, vol: number) => void;
  setMaster: (vol: number) => void;
  play: () => void;
  stop: () => void;
}

function readMix(): { mix: Mix; master: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(MIX_KEY) ?? 'null') as { mix?: Partial<Mix>; master?: number } | null;
    return { mix: { ...DEFAULT_MIX, ...(raw?.mix ?? {}) }, master: raw?.master ?? 0.8 };
  } catch {
    return { mix: DEFAULT_MIX, master: 0.8 };
  }
}

const initial = typeof window === 'undefined' ? { mix: DEFAULT_MIX, master: 0.8 } : readMix();

export const useSound = create<SoundState>((set, get) => {
  const save = () => {
    try {
      localStorage.setItem(MIX_KEY, JSON.stringify({ mix: get().mix, master: get().master }));
    } catch {
      /* bỏ qua */
    }
  };
  return {
    ...initial,
    playing: false,
    supported: typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext),

    toggle: (id) => {
      const ch = get().mix[id];
      const on = !ch.on;
      set({ mix: { ...get().mix, [id]: { ...ch, on } } });
      save();
      if (!get().playing) {
        // Bật một âm khi đang tắt tiếng = muốn nghe luôn
        if (on) get().play();
        return;
      }
      if (on) startChannel(id, ch.vol);
      else {
        stopChannel(id);
        if (!Object.values(get().mix).some((c) => c.on)) get().stop();
      }
    },

    setVolume: (id, vol) => {
      const ch = get().mix[id];
      set({ mix: { ...get().mix, [id]: { ...ch, vol } } });
      save();
      const node = live.get(id);
      if (node && ctx) node.gain.gain.setTargetAtTime(curve(vol) * LEVEL[id], ctx.currentTime, 0.05);
    },

    setMaster: (vol) => {
      set({ master: vol });
      save();
      if (master && ctx && get().playing) master.gain.setTargetAtTime(curve(vol), ctx.currentTime, 0.05);
    },

    play: () => {
      const c = getCtx();
      if (!c || !master) return;
      if (c.state !== 'running') void c.resume();
      const { mix } = get();
      const any = Object.values(mix).some((ch) => ch.on);
      if (!any) return;
      for (const s of SOUNDS) if (mix[s.id].on) startChannel(s.id, mix[s.id].vol);
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setTargetAtTime(curve(get().master), c.currentTime, 0.5);
      set({ playing: true });
    },

    stop: () => {
      if (!get().playing) return;
      set({ playing: false });
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      for (const id of [...live.keys()]) stopChannel(id);
    },
  };
});

export const hasActiveSound = () => Object.values(useSound.getState().mix).some((c) => c.on);
