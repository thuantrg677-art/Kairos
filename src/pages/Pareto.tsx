// Trang "Nguyên lý Pareto 80/20" (mở từ Cài đặt): giới thiệu và cách tư duy theo phương pháp này.
// Thay cho Hướng dẫn sử dụng của bản cũ.

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Zap } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { SubPageHeader } from '@/components/AppShell';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4 lg:p-5">
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink">{children}</div>
    </Card>
  );
}

/** Hai thanh so sánh: 20% nỗ lực tạo ra 80% kết quả */
function Bars() {
  return (
    <div className="flex flex-col gap-2.5" aria-label="20% nỗ lực tạo ra khoảng 80% kết quả">
      {[
        { label: 'Nỗ lực', a: 20, b: 80 },
        { label: 'Kết quả', a: 80, b: 20 },
      ].map((r) => (
        <div key={r.label}>
          <p className="mb-1 text-[13px] font-semibold text-muted">{r.label}</p>
          <div className="flex h-9 overflow-hidden rounded-2xl text-[13px] font-bold">
            <span className="flex items-center justify-center bg-high text-white dark:text-black" style={{ width: `${r.a}%` }}>
              {r.a}%
            </span>
            <span className="flex items-center justify-center bg-surface2 text-muted" style={{ width: `${r.b}%` }}>
              {r.b}%
            </span>
          </div>
        </div>
      ))}
      <p className="text-[13px] leading-snug text-muted">Phần màu đậm: số ít việc quan trọng. Phần nhạt: số nhiều việc thông thường.</p>
    </div>
  );
}

function Numbered({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-highsoft text-[13px] font-bold text-high">{i + 1}</span>
          <span className="pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-primary">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export default function Pareto() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl">
      <SubPageHeader title="Nguyên lý Pareto 80/20" subtitle="Làm ít việc hơn, nhưng là đúng việc." back="/cai-dat" />
      <div className="flex flex-col gap-4 px-4 pb-6 lg:px-8">
        <Card className="p-4 lg:p-5">
          <p className="flex items-center gap-1.5 text-[13px] font-bold tracking-wide text-high uppercase">
            <Zap size={15} fill="currentColor" /> Ý chính
          </p>
          <p className="mt-1.5 text-[19px] leading-snug font-bold text-ink">Phần lớn kết quả thường đến từ một phần nhỏ những việc bạn làm.</p>
          <p className="mt-2 mb-4 text-[15px] leading-relaxed text-muted">
            Không phải việc nào cũng đáng giá như nhau. Nếu tìm ra số ít việc tạo ra nhiều kết quả nhất và làm chúng trước, bạn tiến nhanh hơn mà không cần làm nhiều hơn.
          </p>
          <Bars />
        </Card>

        <Section title="Nguyên lý này từ đâu ra?">
          <p>
            Cuối thế kỷ 19, nhà kinh tế học người Ý <b>Vilfredo Pareto</b> nhận thấy khoảng 80% đất đai ở Ý thuộc về khoảng 20% dân số. Về sau người ta thấy kiểu mất cân bằng này xuất hiện ở rất nhiều nơi khác.
          </p>
          <p>
            Giữa thế kỷ 20, chuyên gia quản lý chất lượng <b>Joseph Juran</b> gọi đó là “số ít quan trọng và số nhiều thông thường” và đặt tên là <b>nguyên lý Pareto</b>: một số ít nguyên nhân tạo ra phần lớn hệ quả.
          </p>
          <p className="rounded-2xl bg-surface2 px-3.5 py-2.5 text-[14px] text-muted">
            Con số 80/20 chỉ là cách nói cho dễ nhớ. Thực tế có thể là 90/10 hay 70/30, và hai con số không cần cộng lại bằng 100. Điều quan trọng là <b className="text-ink">sự chênh lệch</b>.
          </p>
        </Section>

        <Section title="Trong đời sinh viên, 80/20 trông như thế nào?">
          <Bullets
            items={[
              <>
                <b>Ôn thi:</b> luyện đề cũ rồi chữa kỹ từng lỗi sai thường kéo điểm lên nhiều hơn đọc lại cả giáo trình.
              </>,
              <>
                <b>Đồ án:</b> phần phân tích và kết quả chiếm phần lớn điểm; chỉnh màu slide hay căn lề mãi thì ít tác động.
              </>,
              <>
                <b>Ngoại ngữ:</b> vài nghìn từ thông dụng nhất đã bao phủ phần lớn những gì bạn đọc và nghe hằng ngày.
              </>,
              <>
                <b>Thời gian:</b> chỉ vài thói quen nhỏ (lướt mạng, chuyển qua lại giữa các việc) lấy đi phần lớn thời gian bị lãng phí.
              </>,
            ]}
          />
        </Section>

        <Section title="Cách tư duy theo 80/20: 5 câu hỏi">
          <Numbered
            items={[
              <>
                <b>Kết quả mình muốn là gì, đo bằng gì?</b> Không có thước đo thì không biết việc nào là 20%.
              </>,
              <>
                <b>Nếu tuần này chỉ được làm một việc,</b> việc nào đưa mình tới gần mục tiêu nhất?
              </>,
              <>
                <b>Việc nào làm xong thì nhiều việc khác trở nên dễ hơn</b>, hoặc không cần làm nữa?
              </>,
              <>
                <b>Việc nào mình làm vì nó dễ, quen, cho cảm giác bận rộn</b>, chứ không phải vì nó tạo ra kết quả?
              </>,
              <>
                <b>Nhìn lại tuần trước:</b> những việc nào thật sự tạo ra tiến bộ đo được? Làm nhiều hơn những việc đó.
              </>,
            ]}
          />
        </Section>

        <Section title="Còn 80% việc kia thì sao?">
          <p>Không phải bỏ hết. Chúng vẫn có thể cần làm, chỉ là không được chiếm chỗ của việc 20%:</p>
          <Bullets
            items={[
              <>
                <b>Làm nhanh, đủ tốt:</b> không cầu toàn với việc ít tác động.
              </>,
              <>
                <b>Gom lại làm một lần:</b> trả lời tin nhắn, việc giấy tờ, dọn dẹp.
              </>,
              <>
                <b>Nhờ người khác hoặc dùng công cụ</b> nếu được.
              </>,
              <>
                <b>Bỏ hẳn</b> nếu không ai cần tới nó.
              </>,
            ]}
          />
        </Section>

        <Section title="Những hiểu lầm thường gặp">
          <Bullets
            items={[
              <>
                <b>“Chỉ cần làm 20% là đủ.”</b> Việc 80% vẫn cần, nhưng làm sau và làm gọn.
              </>,
              <>
                <b>“Việc 20% luôn là việc to và khó.”</b> Đôi khi nó là việc nhỏ mà ta cứ né: gửi email hỏi thầy, đăng ký lịch thi, nhờ bạn góp ý.
              </>,
              <>
                <b>“Phân loại một lần là xong.”</b> Việc 20% thay đổi theo từng giai đoạn, nên xem lại mỗi tuần.
              </>,
              <>
                <b>“Bận rộn là đang tiến bộ.”</b> Làm nhiều việc 80% vẫn có thể không tiến thêm bước nào tới mục tiêu.
              </>,
            ]}
          />
        </Section>

        <Section title="Kairos áp dụng 80/20 thế nào?">
          <Bullets
            items={[
              <>
                Mỗi đầu việc có nhãn <b className="text-high">Việc 20%</b> (đòn bẩy cao, tưới +3 💧, mỗi việc nhỏ của nó +2 💧) hoặc <b>Việc 80%</b> (+1 💧).
              </>,
              <>Việc 20% luôn đứng đầu danh sách Hôm nay và được ưu tiên xếp vào lúc bạn tỉnh táo nhất.</>,
              <>Mỗi chu kỳ 12 tuần chỉ nên có 2–3 mục tiêu, mỗi mục tiêu 1–2 Việc 20%.</>,
              <>Trợ lý AI giúp bạn phân loại việc, chia việc 20% thành từng bước nhỏ và nhắc khi bạn ôm đồm.</>,
              <>Cuối tuần, nhìn lại xem thời gian của bạn có thật sự dành cho Việc 20% không.</>,
            ]}
          />
        </Section>

        <Card className="p-4 lg:p-5">
          <h2 className="text-[17px] font-bold text-ink">Bài tập 10 phút</h2>
          <Numbered
            items={[
              'Viết ra mọi việc bạn định làm trong tuần này.',
              'Khoanh 2–3 việc tạo ra kết quả lớn nhất cho mục tiêu của bạn.',
              'Xếp chúng vào khung giờ tốt nhất trước, rồi mới tới các việc còn lại.',
              'Với mỗi việc còn lại, chọn: làm nhanh, gom lại, nhờ người khác, hay bỏ.',
            ]}
          />
          <Button className="mt-4 w-full" onClick={() => navigate(`/tro-ly?hoi=${encodeURIComponent('Giúp mình phân việc 80/20 cho tuần này')}`)}>
            <MessageCircle size={18} /> Làm bài tập này cùng Trợ lý
          </Button>
        </Card>
      </div>
    </div>
  );
}
