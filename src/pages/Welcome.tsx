// Phần làm quen của người mới (bản 2): thay cho hướng dẫn sử dụng và bước hỏi mục tiêu dài hạn.
// Vừa vào app là một cuộc trò chuyện dài với Trợ lý AI:
//   hỏi mục tiêu 3–5 năm → hỏi bối cảnh sống, học, làm việc và các số liệu → đề xuất kế hoạch 12 tuần.
// Người dùng chọn rồi bấm thêm là có ngay mục tiêu, đầu việc, lịch cố định. Cuộc trò chuyện này
// tiếp tục ở tab "Trợ lý" sau khi vào app.
// AI không dùng được (xem thử, chưa bật AI…) thì có lối "Tự thiết lập bằng tay" (các bước cũ).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PencilLine } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { ensureGreeting } from '@/lib/chat';
import { getActiveCycle } from '@/lib/logic';
import { Button } from '@/components/ui';
import { LogoMark } from '@/components/Logo';
import { PlantBadge } from '@/components/pickers';
import { ChatView } from '@/components/Chat';
import { useChatBlocker } from './Assistant';
import Onboarding from './Onboarding';

export default function Welcome() {
  const d = useData();
  const navigate = useNavigate();
  const status = useStore((s) => s.status);
  const [manual, setManual] = useState(false);
  const blocker = useChatBlocker();
  const st = useStore.getState();

  const cycle = getActiveCycle(d.cycles);
  const goals = useMemo(() => d.goals.filter((g) => g.status === 'active' && cycle && g.cycle_id === cycle.id), [d.goals, cycle]);

  useEffect(() => {
    if (status === 'ready' && !manual) ensureGreeting('onboarding');
  }, [status, manual]);

  const finish = () => {
    st.updateProfile({ onboarded_at: new Date().toISOString() });
    navigate('/', { replace: true });
  };

  if (manual) return <Onboarding onBack={() => setManual(false)} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <span className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold">Trợ lý Kairos</span>
              <span className="block text-xs text-muted">Cùng lập kế hoạch 12 tuần của bạn</span>
            </span>
          </span>
          <span className="flex items-center">
            <button className="inline-flex min-h-11 items-center gap-1 px-2 text-[13px] font-semibold whitespace-nowrap text-primary" onClick={() => setManual(true)}>
              <PencilLine size={15} /> Tự điền
            </button>
            <button className="min-h-11 px-2 text-[13px] text-muted" onClick={() => void st.signOut()}>
              Thoát
            </button>
          </span>
        </div>
      </header>

      <main className="flex-1 pt-3">
        <ChatView
          mode="onboarding"
          disabledReason={
            blocker && (
              <>
                {blocker}{' '}
                <button className="font-semibold text-primary underline" onClick={() => setManual(true)}>
                  Tự thiết lập bằng tay
                </button>
              </>
            )
          }
          minHeightClass="min-h-[calc(100dvh-70px)]"
          onApplied={(summary) =>
            useStore.getState().insert('chat_messages', {
              role: 'ai',
              content: `🌱 Xong! Mình đã thêm vào kế hoạch: ${summary}.\n\nBấm **Vào Kairos** để bắt đầu ngày đầu tiên. Từ giờ, cần phân việc 80/20 hay chia nhỏ một việc thì cứ mở tab **Trợ lý**, mình vẫn nhớ cuộc trò chuyện này.`,
              meta: {},
            })
          }
          footer={
            goals.length > 0 && (
              <div className="k-fade-in mb-2 flex items-center gap-3 rounded-2xl bg-soft px-3 py-2">
                <span className="flex -space-x-2">
                  {goals.slice(0, 3).map((g) => (
                    <PlantBadge key={g.id} species={g.plant} stage={4} size={36} />
                  ))}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug font-semibold text-ink">Đã gieo {goals.length} cây cho 12 tuần tới. Muốn sửa thêm thì cứ nhắn tiếp.</span>
                <Button size="sm" onClick={finish}>
                  Vào Kairos <ArrowRight size={16} />
                </Button>
              </div>
            )
          }
        />
      </main>
    </div>
  );
}
