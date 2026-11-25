// Tab "Trợ lý": trò chuyện với Trợ lý AI bất cứ lúc nào (phân việc 80/20, chia nhỏ việc, giữ lộ trình).
// Trợ lý luôn biết bối cảnh, mục tiêu và lịch của người dùng; xem/xóa những điều nó ghi nhớ ở nút "Trợ lý nhớ gì".

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ensureGreeting } from '@/lib/chat';
import { checkAI, useChatQuota } from '@/lib/ai';
import { Button, IconButton, Sheet } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { ChatView } from '@/components/Chat';

export function useChatBlocker(): string | null {
  const mode = useStore((s) => s.mode);
  const gd5 = useStore((s) => s.gd5);
  const online = useStore((s) => s.online);
  const [aiState, setAiState] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void checkAI().then((r) => alive && setAiState(r.state));
    return () => {
      alive = false;
    };
  }, [mode, online]);
  if (mode === 'demo') return 'Đây là chế độ xem thử nên Trợ lý chưa trả lời được. Đăng nhập tài khoản để trò chuyện thật.';
  if (!online) return 'Bạn đang offline. Có mạng lại là trò chuyện tiếp được.';
  if (!gd5) return 'Chủ app cần chạy file 005_v2.sql trong Supabase thì mới trò chuyện với Trợ lý được (xem docs/HUONG-DAN-BAN-2.md).';
  if (aiState === 'missing' || aiState === 'no_key') return 'AI chưa được bật: chủ app cần tạo Edge Function "ai" và thêm khóa Gemini (xem hướng dẫn giai đoạn 2a).';
  return null;
}

/** Những điều Trợ lý ghi nhớ về bạn: xem, xóa, thêm; và xóa cuộc trò chuyện */
function MemorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const count = useStore((s) => s.chat_messages.length);
  const quota = useChatQuota();
  const [note, setNote] = useState('');
  const memory = profile?.ai_context ?? [];
  const st = useStore.getState();

  const save = (list: string[]) => st.updateProfile({ ai_context: list });
  const add = () => {
    const t = note.trim().slice(0, 160);
    if (!t) return;
    save([...memory, t].slice(-40));
    setNote('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Trợ lý nhớ gì về bạn">
      <p className="text-sm leading-relaxed text-muted">
        Ngoài các mục tiêu, đầu việc và lịch của bạn, Trợ lý ghi nhớ thêm những điều bạn kể về hoàn cảnh của mình để lần sau không phải hỏi lại. Chỉ bạn và AI đọc được.
      </p>
      {memory.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface2 px-3.5 py-3 text-sm text-muted">Chưa có gì. Kể cho Trợ lý nghe về việc học, lịch sinh hoạt hay khó khăn của bạn nhé.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {memory.map((m, i) => (
            <li key={`${i}-${m}`} className="flex items-start gap-2 rounded-2xl bg-surface2 py-1.5 pr-1 pl-3.5 text-sm leading-snug">
              <span className="flex-1 py-1.5">{m}</span>
              <IconButton label={`Quên: ${m}`} className="h-9 w-9 text-muted" onClick={() => save(memory.filter((_, k) => k !== i))}>
                <X size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input className="k-input" value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Thêm một điều, vd: Mình học tốt nhất buổi sáng" />
        <Button variant="soft" onClick={add} disabled={!note.trim()} aria-label="Thêm điều cần nhớ">
          <Plus size={18} />
        </Button>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        {quota.remaining !== null && (
          <p className="mb-2 text-[13px] text-muted">
            Hôm nay còn {quota.remaining}/{quota.limit} tin nhắn trò chuyện.
          </p>
        )}
        <Button
          variant="danger"
          disabled={count === 0}
          onClick={() => {
            if (!window.confirm('Xóa toàn bộ cuộc trò chuyện? Những điều Trợ lý ghi nhớ ở trên vẫn được giữ.')) return;
            st.clearChat();
            onClose();
          }}
        >
          <Trash2 size={17} /> Xóa cuộc trò chuyện
        </Button>
      </div>
    </Sheet>
  );
}

export default function Assistant() {
  const [params, setParams] = useSearchParams();
  const [memory, setMemory] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();
  const status = useStore((s) => s.status);
  const blocker = useChatBlocker();

  // Mở từ nơi khác với câu hỏi soạn sẵn: /tro-ly?hoi=...
  useEffect(() => {
    const q = params.get('hoi');
    if (!q) return;
    setPrefill(q);
    setParams({}, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (status === 'ready') ensureGreeting('free');
  }, [status]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Trợ lý" subtitle="Phân việc 80/20 và giữ đúng lộ trình tới mục tiêu.">
        <IconButton label="Trợ lý nhớ gì về bạn" onClick={() => setMemory(true)}>
          <Brain size={22} />
        </IconButton>
      </PageHeader>
      <ChatView
        mode="free"
        prefill={prefill}
        disabledReason={blocker}
        stickyClass="bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] lg:bottom-0"
        minHeightClass="min-h-[calc(100dvh-190px)] lg:min-h-[calc(100dvh-120px)]"
      />
      <MemorySheet open={memory} onClose={() => setMemory(false)} />
    </div>
  );
}
