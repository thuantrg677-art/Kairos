// Hướng dẫn sử dụng: lời chào của nhóm SEEDS → cảm hứng → các nguyên lý (80/20, tập trung sâu, 12 tuần,
// mục tiêu dài hạn/ngắn hạn, nhìn lại) → toàn bộ tính năng → bắt đầu bằng những bước nhỏ.
// Người mới thấy hướng dẫn này ngay sau khi đăng nhập lần đầu (trước phần thiết lập 4 bước).
// Mở lại bất cứ lúc nào ở Cài đặt → Hướng dẫn sử dụng (/huong-dan).

import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  Compass,
  Hourglass,
  BookOpenText,
  ListChecks,
  NotebookPen,
  Palette,
  PenLine,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Timer,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { markGuideSeen, patchSettings, practiceSteps, TEAM } from '@/lib/guide';
import { Button, cx, LeverageBadge } from '@/components/ui';
import { LogoMark } from '@/components/Logo';
import { Plant } from '@/components/Plant';
import { Scenery } from '@/components/Scenery';

// ------------------------------------------------------------
// Khối dựng dùng chung
// ------------------------------------------------------------

/** Khung tranh minh họa ở đầu mỗi trang: nền trời + đồi theo màu theme */
function Art({ children, className, hill = true }: { children: ReactNode; className?: string; hill?: boolean }) {
  return (
    <div
      className={cx('relative mb-5 flex h-44 items-center justify-center overflow-hidden rounded-[32px] border border-line', className)}
      style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2) 75%)' }}
      aria-hidden
    >
      {hill && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: 'var(--k-hill-2)' }} />
          <div className="absolute inset-x-0 bottom-6 h-9 rounded-[50%]" style={{ background: 'var(--k-hill-2)' }} />
        </>
      )}
      <div className="relative flex h-full w-full items-center justify-center">{children}</div>
    </div>
  );
}

function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('mt-2.5 text-[15px] leading-relaxed text-ink', className)}>{children}</p>;
}

/** Một ý chính: biểu tượng + tiêu đề + mô tả */
function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

/** Ô "Trong Kairos": nối nguyên lý với tính năng cụ thể */
function InKairos({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-soft px-4 py-3">
      <p className="text-xs font-bold tracking-wide text-primary uppercase">Trong Kairos</p>
      <div className="mt-1 text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}

/** Thanh tab thu nhỏ (giống thanh dưới của app) để người dùng nhận ra các màn */
function MiniTabs({ active }: { active: string[] }) {
  const tabs = [
    { label: 'Hôm nay', icon: Sun },
    { label: 'Mục tiêu', icon: Target },
    { label: 'Focus', icon: Timer },
    { label: 'Vườn', icon: Sprout },
    { label: 'Tổng quan', icon: ChartNoAxesColumn },
  ];
  return (
    <div className="flex w-[92%] max-w-sm rounded-3xl border border-line bg-surface/95 px-1 py-2 shadow-lg shadow-black/10">
      {tabs.map((t) => {
        const on = active.includes(t.label);
        return (
          <span key={t.label} className={cx('flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium', on ? 'text-primary' : 'text-muted opacity-60')}>
            <span className={cx('flex h-7 w-11 items-center justify-center rounded-full', on && 'bg-soft')}>
              <t.icon size={19} strokeWidth={on ? 2.4 : 2} />
            </span>
            {t.label}
          </span>
        );
      })}
    </div>
  );
}

/** Thẻ giới thiệu một tính năng */
function Feature({ icon, name, where, children }: { icon: ReactNode; name: string; where: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-bold text-ink">
          {name} <span className="text-xs font-medium text-muted">· {where}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Tranh minh họa riêng cho từng trang
// ------------------------------------------------------------

function TeamArt() {
  return (
    <Art>
      <div className="absolute bottom-3 flex w-full items-end justify-center gap-6">
        <Plant species="sen" stage={1} size={54} sway />
        <Plant species="tan-tron" stage={2} size={64} sway />
        <Plant species="linh-lan" stage={1} size={54} sway />
      </div>
      <LogoMark size={76} className="k-pop -mt-14 shadow-lg shadow-black/15" />
    </Art>
  );
}

function ParetoArt() {
  const Bar = ({ label, first, firstLabel, restLabel }: { label: string; first: number; firstLabel: string; restLabel: string }) => (
    <div>
      <p className="mb-1 text-xs font-bold text-ink">{label}</p>
      <div className="flex h-8 overflow-hidden rounded-xl text-xs font-bold">
        <span className="flex items-center justify-center bg-high text-highsoft" style={{ width: `${first}%` }}>
          {firstLabel}
        </span>
        <span className="flex flex-1 items-center justify-center bg-line text-muted">{restLabel}</span>
      </div>
    </div>
  );
  return (
    <Art hill={false}>
      <div className="flex w-[86%] max-w-sm flex-col gap-3 rounded-3xl bg-surface/95 p-4 shadow-lg shadow-black/10">
        <Bar label="Nỗ lực bỏ ra" first={20} firstLabel="20%" restLabel="80%" />
        <Bar label="Kết quả nhận về" first={80} firstLabel="80%" restLabel="20%" />
      </div>
    </Art>
  );
}

function FocusArt() {
  return (
    <Art>
      <div className="absolute bottom-3 flex w-full items-end justify-center gap-3">
        {[1, 2, 3, 4].map((s) => (
          <Plant key={s} species="tan-tron" stage={s} size={46 + s * 10} sway={s === 4} />
        ))}
      </div>
      <span className="absolute top-4 rounded-full bg-surface/95 px-4 py-1.5 font-mono text-xl font-bold text-ink shadow">25:00</span>
    </Art>
  );
}

function WeeksArt() {
  return (
    <Art hill={false}>
      <div className="w-[88%] max-w-sm rounded-3xl bg-surface/95 p-4 shadow-lg shadow-black/10">
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={cx('flex h-9 items-center justify-center rounded-xl text-xs font-bold', i < 5 ? 'bg-primary text-onprimary' : i === 5 ? 'bg-soft text-primary ring-2 ring-primary' : 'bg-surface2 text-muted')}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-center text-xs font-semibold text-muted">12 tuần = một "năm" ngắn · tuần nào cũng quan trọng</p>
      </div>
    </Art>
  );
}

function PyramidArt() {
  const rows = [
    { w: '58%', icon: <Compass size={16} />, text: 'Tầm nhìn 3–5 năm' },
    { w: '74%', icon: <Target size={16} />, text: '2–3 mục tiêu 12 tuần' },
    { w: '90%', icon: <ListChecks size={16} />, text: 'Đầu việc mỗi tuần, mỗi ngày' },
  ];
  return (
    <Art hill={false}>
      <div className="flex w-full max-w-sm flex-col items-center gap-1.5">
        {rows.map((r, i) => (
          <span
            key={r.text}
            className={cx('flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-bold shadow', i === 0 ? 'bg-primary text-onprimary' : i === 1 ? 'bg-soft text-primary' : 'bg-surface text-ink')}
            style={{ width: r.w }}
          >
            {r.icon}
            {r.text}
          </span>
        ))}
      </div>
    </Art>
  );
}

function LoopArt() {
  // Bốn bước của vòng lặp đặt quanh một vòng tròn
  const nodes = [
    { label: 'Lên kế hoạch', x: 50, y: 12 },
    { label: 'Làm', x: 86, y: 50 },
    { label: 'Nhìn lại', x: 50, y: 88 },
    { label: 'Điều chỉnh', x: 14, y: 50 },
  ];
  return (
    <Art hill={false}>
      <div className="relative h-40 w-64">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <ellipse cx="50" cy="50" rx="36" ry="38" fill="none" stroke="var(--k-primary)" strokeWidth="1.6" strokeDasharray="4 3" />
        </svg>
        {nodes.map((n, i) => (
          <span
            key={n.label}
            className={cx('absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow', i === 2 ? 'bg-primary text-onprimary' : 'bg-surface text-ink')}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            {n.label}
          </span>
        ))}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">🔁</span>
      </div>
    </Art>
  );
}

function StartArt() {
  return (
    <Art>
      <div className="absolute bottom-3 flex w-full items-end justify-center gap-5">
        <Plant species="ly" stage={0} size={56} />
        <Plant species="sen" stage={1} size={60} sway />
        <Plant species="thong" stage={0} size={56} />
      </div>
      <span className="absolute top-4 rounded-full bg-surface/95 px-3.5 py-1.5 text-sm font-bold text-ink shadow">Gieo hạt đầu tiên 🌱</span>
    </Art>
  );
}

// ------------------------------------------------------------
// Nội dung các trang
// ------------------------------------------------------------

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  art?: ReactNode;
  body: ReactNode;
}

function TeamList() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-ink">
        <Users size={18} className="text-primary" />
        <span className="flex-1">Gặp gỡ {TEAM.length} thành viên nhóm SEEDS</span>
        <ChevronDown size={18} className={cx('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="k-fade-in flex flex-col gap-1.5 px-4 pb-3.5">
          {TEAM.map((m) => (
            <li key={m.name} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-semibold text-ink">{m.name}</span>
              <span className="text-[13px] text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildSlides(): Slide[] {
  return [
    {
      key: 'team',
      eyebrow: 'Lời chào',
      title: 'Xin chào, tụi mình là nhóm SEEDS 🌱',
      art: <TeamArt />,
      body: (
        <>
          <P>
            Kairos được <b>nhóm SEEDS</b> phát triển trong học phần <b>Khởi nghiệp sáng tạo</b>. Kairos ra đời trong khuôn khổ một học phần, nhưng tụi mình mong sẽ tiếp tục chăm cho nó lớn lên cả sau khi môn học kết thúc.
          </P>
          <P>
            <i>Seeds</i> nghĩa là những hạt giống, giống như mỗi mục tiêu bạn gieo trong Kairos. Bạn là một trong những người dùng đầu tiên, nên mọi góp ý của bạn đều giúp app tốt hơn.
          </P>
          <TeamList />
        </>
      ),
    },
    {
      key: 'why',
      eyebrow: 'Cảm hứng',
      title: 'Vì sao tụi mình làm Kairos?',
      art: (
        <div className="relative mb-5 overflow-hidden rounded-[32px] border border-line" aria-hidden>
          <Scenery className="block h-44 w-full" />
          <span className="absolute top-4 left-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-ink">Kairos · "thời điểm đúng"</span>
        </div>
      ),
      body: (
        <>
          <P>
            Sinh viên tụi mình luôn bận: deadline, đi học, đi làm thêm, câu lạc bộ… Bận cả ngày mà nhìn lại vẫn thấy những việc thật sự quan trọng cứ bị lùi sang “để mai”. Kế hoạch cả năm thì quá xa, còn danh sách việc thì dài mà không biết việc nào đáng làm trước.
          </P>
          <P>
            Người Hy Lạp xưa có hai chữ cho thời gian: <i>Chronos</i> là thời gian trôi đều theo đồng hồ, còn <b>Kairos</b> là <b>thời điểm đúng</b> để làm điều đáng làm. Tụi mình muốn app giúp bạn:
          </P>
          <div className="mt-4 flex flex-col gap-3">
            <Point icon={<Compass size={20} />} title="Lập kế hoạch dài hạn và ngắn hạn thật rõ ràng">
              Biết mình muốn đi đâu trong vài năm tới, và 12 tuần này cần làm gì để tới gần hơn.
            </Point>
            <Point icon={<CalendarDays size={20} />} title="Quản lý thời gian trong tuần, trong ngày">
              Thấy rõ lúc nào đã kín, lúc nào còn trống để đặt việc vào.
            </Point>
            <Point icon={<Zap size={20} />} title="Dành thời gian cho việc quan trọng">
              Làm việc đem lại kết quả lớn trước, việc vặt sau.
            </Point>
          </div>
        </>
      ),
    },
    {
      key: 'pareto',
      eyebrow: 'Nguyên lý 1',
      title: 'Pareto 80/20: không phải việc nào cũng ngang nhau',
      art: <ParetoArt />,
      body: (
        <>
          <P>
            Nhà kinh tế học Vilfredo Pareto nhận thấy khoảng 80% ruộng đất ở Ý thuộc về khoảng 20% dân số. Về sau, người ta thấy tỉ lệ lệch như vậy xuất hiện ở rất nhiều nơi: <b>khoảng 20% nỗ lực tạo ra khoảng 80% kết quả</b>.
          </P>
          <P>
            Con số không cần chính xác. Điều quan trọng là: trong danh sách việc của bạn luôn có vài việc “đòn bẩy”, như ôn đúng dạng bài hay ra thi, sửa CV và gửi đúng chỗ, hay làm phần khó nhất của đồ án. Làm những việc đó trước thì một ngày bận rộn mới thật sự đáng giá.
          </P>
          <InKairos>
            <p>Mỗi đầu việc mang một trong hai nhãn:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <LeverageBadge leverage="high" />
              <LeverageBadge leverage="normal" />
            </div>
            <p className="mt-2">Màn Hôm nay luôn đưa việc 20% lên đầu. Không chắc việc nào thuộc nhóm nào? Bấm ✨ <b>AI gợi ý nhãn</b>, AI sẽ chọn kèm lý do.</p>
          </InKairos>
        </>
      ),
    },
    {
      key: 'focus',
      eyebrow: 'Nguyên lý 2',
      title: 'Tập trung sâu: một việc, trọn vẹn',
      art: <FocusArt />,
      body: (
        <>
          <P>
            Mỗi lần bạn đang làm bài mà chuyển sang xem điện thoại, đầu óc cần thêm thời gian mới quay lại được mạch cũ. Nhà nghiên cứu Sophie Leroy gọi đó là <b>“dư âm chú ý”</b>: một phần sự chú ý vẫn mắc lại ở việc trước. Làm nhiều thứ cùng lúc khiến việc nào cũng nông.
          </P>
          <P>
            Cal Newport gọi khả năng làm một việc khó trong khối thời gian liền mạch, không bị cắt ngang là <b>Deep Work</b>. Một khối 25–90 phút tập trung thật thường làm được nhiều hơn cả buổi chiều làm chập chờn.
          </P>
          <div className="mt-4 flex flex-col gap-3">
            <Point icon={<Target size={20} />} title="Chọn một việc, tốt nhất là việc 20%">
              Biết rõ mình sẽ làm gì trước khi bấm giờ.
            </Point>
            <Point icon={<Hourglass size={20} />} title="Đặt giờ, cất điện thoại, nghỉ ngắn sau mỗi khối">
              Bắt đầu với 25 phút. Quen rồi thì nâng lên 50 hoặc 90 phút.
            </Point>
          </div>
          <InKairos>
            Tab <b>Focus</b> có đồng hồ 25/50/90 phút hoặc tự đặt, giờ nghỉ, âm thanh nền (mưa, gió, chim, quán cà phê, ồn trắng). Mầm cây lớn dần theo thời gian bạn tập trung và nở hoa khi hết giờ. Rời app giữa chừng, Kairos sẽ nhắc bạn quay lại.
          </InKairos>
        </>
      ),
    },
    {
      key: '12w',
      eyebrow: 'Nguyên lý 3',
      title: 'Kế hoạch 12 tuần: một năm gói trong 3 tháng',
      art: <WeeksArt />,
      body: (
        <>
          <P>
            Khi đặt mục tiêu cho cả năm, ta hay nghĩ “còn nhiều thời gian lắm”, rồi đến cuối năm mới cuống lên. Phương pháp <b>The 12 Week Year</b> (Brian P. Moran và Michael Lennington) đề xuất: <b>coi 12 tuần như một năm</b>. Hạn chót luôn ở gần, nên tuần nào cũng quan trọng.
          </P>
          <div className="mt-4 flex flex-col gap-3">
            <Point icon={<Target size={20} />} title="Chỉ 2–3 mục tiêu cho mỗi 12 tuần">
              Ít mục tiêu thì mới đủ sức làm đến nơi đến chốn.
            </Point>
            <Point icon={<ListChecks size={20} />} title="Đo việc mình làm, không chỉ đo kết quả">
              Điểm thực thi tuần = số việc đã làm ÷ số việc đã lên kế hoạch. Theo sách, làm được khoảng 85% kế hoạch là bạn đang đi đúng hướng.
            </Point>
          </div>
          <InKairos>
            Mỗi chu kỳ dài 12 tuần, bắt đầu từ thứ Hai. Màn Hôm nay hiện “Tuần x/12”, còn <b>Tổng quan</b> vẽ điểm thực thi của từng tuần. Hết chu kỳ, bạn tổng kết rồi gieo hạt cho 12 tuần mới.
          </InKairos>
        </>
      ),
    },
    {
      key: 'goals',
      eyebrow: 'Nguyên lý 4',
      title: 'Từ đích đến xa tới việc của hôm nay',
      art: <PyramidArt />,
      body: (
        <>
          <P>Mục tiêu tốt cần cả tầm nhìn xa lẫn bước đi gần. Kairos nối ba tầng với nhau:</P>
          <div className="mt-4 flex flex-col gap-3">
            <Point icon={<Compass size={20} />} title="Mục tiêu dài hạn (3–5 năm)">
              Cho bạn <b>lý do</b>: mình muốn trở thành ai, điều gì quan trọng nhất. Ví dụ: “Du học thạc sĩ và dùng tiếng Anh tự tin”.
            </Point>
            <Point icon={<Target size={20} />} title="Mục tiêu ngắn hạn (12 tuần)">
              Cho bạn <b>hướng đi gần</b>: rõ ràng, đo được, có ngày hoàn thành. Ví dụ: “Đạt IELTS 6.5, đo bằng điểm thi thử”.
            </Point>
            <Point icon={<ListChecks size={20} />} title="Đầu việc">
              Cho bạn <b>việc cụ thể để bắt tay vào</b>. Có thể lặp lại theo thứ hoặc làm một lần. Ví dụ: “Luyện 1 đề Listening, thứ 2-4-6, 45 phút”.
            </Point>
          </div>
          <InKairos>
            Mỗi mục tiêu 12 tuần phải gắn với một mục tiêu dài hạn. Khi viết mục tiêu, bấm ✨ <b>AI giúp diễn đạt</b> để câu chữ rõ hơn, và ✨ <b>AI nhận xét mức liên kết</b> để xem mục tiêu đã đo được và nối đúng với đích đến xa chưa.
          </InKairos>
        </>
      ),
    },
    {
      key: 'review',
      eyebrow: 'Nguyên lý 5',
      title: 'Nhìn lại để đi xa hơn',
      art: <LoopArt />,
      body: (
        <>
          <P>
            Kế hoạch chỉ là điểm xuất phát. Không nhìn lại thì ta dễ lặp lại lỗi cũ, và cũng không thấy mình đã tiến được bao xa. Nhìn lại không phải để tự trách, mà để <b>tuần sau làm khéo hơn tuần này</b>.
          </P>
          <div className="mt-4 flex flex-col gap-3">
            <Point icon={<BookOpen size={20} />} title="Mỗi tối, 1 phút: nhật ký">
              Năng lượng hôm nay thế nào, đã làm được gì, mai muốn làm tốt hơn điều gì.
            </Point>
            <Point icon={<NotebookPen size={20} />} title="Mỗi cuối tuần, 5 phút: nhìn lại tuần">
              Xem điểm thực thi, những việc 20% bị lỡ, trả lời ba câu: điều làm tốt, bài học, tuần tới tập trung vào đâu. ✨ AI có thể đọc tuần của bạn và nhận xét.
            </Point>
            <Point icon={<Sprout size={20} />} title="Cuối mỗi 12 tuần: tổng kết chu kỳ">
              Các cây của chu kỳ được đưa vào <b>Khu vườn kỷ niệm</b>, rồi bạn bắt đầu 12 tuần mới với bài học của chu kỳ trước.
            </Point>
          </div>
        </>
      ),
    },
    {
      key: 'features-day',
      eyebrow: 'Tính năng · 1/2',
      title: 'Mỗi ngày với Kairos',
      art: (
        <Art hill={false}>
          <MiniTabs active={['Hôm nay', 'Focus']} />
        </Art>
      ),
      body: (
        <div className="mt-1 flex flex-col gap-2">
          <Feature icon={<Sun size={20} />} name="Hôm nay" where="tab đầu tiên">
            Việc của ngày xếp theo ưu tiên (việc 20% lên đầu) và dòng thời gian. Bấm <b>Tự xếp</b> hoặc ✨ <b>AI xếp lịch</b> để đặt việc vào khung trống; kéo tay nắm ⋮⋮ để đổi giờ. Tick xong việc là tưới cây.
          </Feature>
          <Feature icon={<PenLine size={20} />} name="Ghi nhanh & Nháp" where="nút bút nổi">
            Ý tưởng, việc chợt nhớ ra: ghi ngay, sắp xếp sau. Trong Nháp, ✨ AI gợi ý mục nào nên thành đầu việc, thuộc mục tiêu nào, mục nào chỉ cần giữ làm ghi chú.
          </Feature>
          <Feature icon={<Timer size={20} />} name="Focus" where="tab giữa">
            Đồng hồ tập trung với mầm cây, âm thanh nền và thống kê giờ focus theo ngày, tuần, mục tiêu, tỉ lệ thời gian cho việc 20%.
          </Feature>
          <Feature icon={<BookOpen size={20} />} name="Nhật ký" where="Hôm nay, Tổng quan">
            Ba câu ngắn mỗi tối. Đội ngũ không đọc nhật ký của bạn; AI chỉ đọc khi bạn bấm nhận xét tuần.
          </Feature>
          <Feature icon={<CalendarDays size={20} />} name="Lịch cố định" where="Cài đặt">
            Lịch học, lịch làm lặp lại hằng tuần. Kairos dựa vào đó để biết bạn còn trống lúc nào.
          </Feature>
          <Feature icon={<Bell size={20} />} name="Thông báo" where="chuông, Cài đặt">
            Tóm tắt buổi sáng, nhắc deadline quan trọng trước 7, 3 và 1 ngày, nhắc viết nhật ký buổi tối. Tự chọn giờ nhắc.
          </Feature>
        </div>
      ),
    },
    {
      key: 'features-cycle',
      eyebrow: 'Tính năng · 2/2',
      title: 'Mỗi tuần và cả chu kỳ 12 tuần',
      art: (
        <Art hill={false}>
          <MiniTabs active={['Mục tiêu', 'Vườn', 'Tổng quan']} />
        </Art>
      ),
      body: (
        <div className="mt-1 flex flex-col gap-2">
          <Feature icon={<Target size={20} />} name="Mục tiêu" where="tab thứ hai">
            Mục tiêu dài hạn → mục tiêu 12 tuần → đầu việc. ✨ <b>AI gợi ý đầu việc</b> giúp chia mục tiêu thành việc nhỏ, có sẵn nhãn 20/80.
          </Feature>
          <Feature icon={<Sprout size={20} />} name="Vườn" where="tab thứ tư">
            Mỗi mục tiêu là một cây (sen, ly, linh lan, tán tròn, thông), lớn qua 5 giai đoạn theo số 💧. Ba ngày không tưới cây hơi héo, tick một việc là tươi lại.
          </Feature>
          <Feature icon={<ChartNoAxesColumn size={20} />} name="Tổng quan" where="tab cuối">
            Điểm thực thi từng tuần, deadline sắp tới, giờ focus, chi tiết từng mục tiêu. Từ đây mở <b>Nhìn lại tuần</b>, <b>Nhật ký</b> và <b>Lịch sử</b> dạng lịch.
          </Feature>
          <Feature icon={<Sparkles size={20} />} name="Trợ lý AI" where="các nút ✨">
            15 lượt mỗi ngày. Hết lượt, các nút xếp lịch vẫn chạy bằng quy tắc nên bạn không bị kẹt.
          </Feature>
          <Feature icon={<Palette size={20} />} name="Giao diện & cài app" where="Cài đặt">
            6 giao diện, mỗi cái có bản sáng và tối. Cài Kairos lên màn hình chính để mở như một app và nhận thông báo.
          </Feature>
          <Feature icon={<BookOpenText size={20} />} name="Hướng dẫn này" where="Cài đặt">
            Mở lại bất cứ lúc nào ở <b>Cài đặt → Hướng dẫn sử dụng</b>.
          </Feature>
        </div>
      ),
    },
    {
      key: 'start',
      eyebrow: 'Bắt đầu',
      title: 'Bắt đầu nhẹ nhàng, từ những hạt giống nhỏ',
      art: <StartArt />,
      body: <StartBody />,
    },
  ];
}

function StartBody() {
  const steps = practiceSteps({ tasks: [], task_completions: [], schedule_blocks: [], focus_sessions: [], inbox_items: [], journals: [], weekly_reviews: [] });
  return (
    <>
      <P>
        Tuần đầu, đừng cố lập một kế hoạch hoàn hảo. Hãy <b>tập với mục tiêu nhỏ và việc dễ</b> để quen tay, ví dụ “Đọc xong 3 cuốn sách” hay “Tập thể dục 3 buổi mỗi tuần”, mỗi việc chỉ 15–30 phút. Mọi thứ đều sửa được sau.
      </P>
      <P>
        Ở phần thiết lập tiếp theo có sẵn <b>gợi ý mẫu</b> để bạn chọn nhanh. Sau đó, màn Hôm nay sẽ có thẻ <b>Tập làm quen</b> với {steps.length} bước nhỏ:
      </P>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2.5 rounded-2xl bg-surface2 px-3 py-2 text-sm text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">{i + 1}</span>
            <span>
              {s.emoji} {s.title}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

// ------------------------------------------------------------
// Màn hướng dẫn
// ------------------------------------------------------------

export default function Guide({ mode, onFinish }: { mode: 'first' | 'replay'; onFinish?: () => void }) {
  const navigate = useNavigate();
  const [slides] = useState(buildSlides);
  const [i, setI] = useState(0);
  const practiceHidden = useStore((s) => !!s.profile?.settings.practice_hidden);
  const seen = useStore((s) => !!s.profile?.settings.guide_seen_at);
  const last = i === slides.length - 1;
  const slide = slides[i];
  const topRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (!seen) markGuideSeen();
    if (mode === 'first') return onFinish?.();
    // Mở từ Cài đặt thì quay lại đó; mở thẳng bằng đường dẫn thì về Hôm nay
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [seen, mode, onFinish, navigate]);

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, n));
      setI(next);
      window.scrollTo(0, 0);
      topRef.current?.focus({ preventScroll: true });
    },
    [slides.length],
  );

  // Phím mũi tên trên máy tính
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go]);

  // Vuốt ngang trên điện thoại
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="safe-top">
        <div className="flex items-center justify-between gap-2 pt-4">
          <span className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="text-[15px] font-bold tracking-tight">Hướng dẫn sử dụng</span>
          </span>
          {mode === 'first' ? (
            !last && (
              <button className="min-h-11 px-1 text-sm font-semibold text-muted" onClick={close}>
                Bỏ qua
              </button>
            )
          ) : (
            <button aria-label="Đóng hướng dẫn" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface2" onClick={close}>
              <X size={22} />
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Các trang hướng dẫn">
          {slides.map((s, n) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={n === i}
              aria-label={`Trang ${n + 1}: ${s.title}`}
              onClick={() => go(n)}
              className="flex h-5 flex-1 items-center"
            >
              <span className={cx('h-1.5 w-full rounded-full transition-colors', n <= i ? 'bg-primary' : 'bg-line')} />
            </button>
          ))}
        </div>
      </header>

      <main className="k-fade-in flex-1 py-4 outline-none" key={slide.key} ref={topRef} tabIndex={-1} aria-label={`Trang ${i + 1}/${slides.length}`}>
        {slide.art}
        <p className="text-[13px] font-bold tracking-wide text-primary uppercase">
          {slide.eyebrow} · {i + 1}/{slides.length}
        </p>
        <h1 className="mt-1 text-[24px] leading-tight font-bold text-ink">{slide.title}</h1>
        {slide.body}

        {last && (
          <p className="mt-5 text-center text-[13px] text-muted">
            Mở lại hướng dẫn này bất cứ lúc nào ở <b>Cài đặt → Hướng dẫn sử dụng</b>.
          </p>
        )}
        {last && mode === 'replay' && practiceHidden && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                patchSettings({ practice_hidden: false });
                useStore.getState().toast('Thẻ Tập làm quen đã hiện lại ở màn Hôm nay', 'success');
              }}
            >
              Hiện lại thẻ Tập làm quen
            </Button>
          </div>
        )}
      </main>

      <footer className="safe-bottom sticky bottom-0 -mx-5 border-t border-line bg-bg/95 px-5 pt-3 backdrop-blur">
        <div className="flex w-full gap-2 pb-3">
          {i > 0 && (
            <Button variant="outline" size="lg" onClick={() => go(i - 1)} aria-label="Trang trước">
              <ArrowLeft size={18} />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={() => (last ? close() : go(i + 1))}>
            {last ? (mode === 'first' ? 'Bắt đầu thiết lập' : 'Xong, quay lại app') : i === 0 ? 'Bắt đầu tìm hiểu' : 'Tiếp tục'}
            {(!last || mode === 'first') && <ArrowRight size={18} />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
