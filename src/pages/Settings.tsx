// "Cài đặt": giao diện, lịch cố định, khung giờ trong ngày, cài app, tài khoản.

import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, LogOut, RotateCcw, Share } from 'lucide-react';
import { useStore } from '@/lib/store';
import { isIOS, usePwa } from '@/lib/pwa';
import { hmToMin, minToHM } from '@/lib/dates';
import { isDark } from '@/lib/themes';
import { Button, Card, Field, IconButton } from '@/components/ui';
import { DarkModePicker, ThemePicker } from '@/components/pickers';
import { FixedScheduleEditor } from '@/components/FixedScheduleEditor';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-bold tracking-wide text-muted uppercase">{title}</h2>
      <Card className="p-4">{children}</Card>
    </section>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile)!;
  const mode = useStore((s) => s.mode);
  const email = useStore((s) => s.email);
  const { canInstall, installed, promptInstall } = usePwa();
  const st = useStore.getState();

  const dayStart = profile.settings.day_start_min ?? 360;
  const dayEnd = profile.settings.day_end_min ?? 1380;
  const setDay = (patch: { day_start_min?: number; day_end_min?: number }) => {
    const next = { ...profile.settings, ...patch };
    if ((next.day_end_min ?? 1380) - (next.day_start_min ?? 360) < 120) return st.toast('Một ngày cần dài ít nhất 2 tiếng.');
    st.updateProfile({ settings: next });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-1 px-2 pt-4 pb-2 lg:px-6 lg:pt-8">
        <IconButton label="Quay lại" onClick={() => navigate(-1)} className="lg:hidden">
          <ArrowLeft size={22} />
        </IconButton>
        <h1 className="px-2 text-[26px] leading-tight font-bold">Cài đặt</h1>
      </header>

      <div className="flex flex-col gap-5 px-4 lg:px-8">
        <Section title="Giao diện">
          <ThemePicker value={profile.theme} dark={isDark(profile.dark_mode)} onChange={(theme) => st.updateProfile({ theme })} />
          <div className="mt-3">
            <DarkModePicker value={profile.dark_mode} onChange={(dark_mode) => st.updateProfile({ dark_mode })} />
          </div>
          <p className="mt-2 text-[13px] text-muted">Giao diện được lưu theo tài khoản, đăng nhập ở máy khác vẫn giữ nguyên.</p>
        </Section>

        <Section title="Tên hiển thị">
          <input
            className="k-input"
            defaultValue={profile.display_name}
            maxLength={60}
            placeholder="Kairos nên gọi bạn là gì?"
            aria-label="Tên hiển thị"
            onBlur={(e) => e.target.value.trim() !== profile.display_name && st.updateProfile({ display_name: e.target.value.trim() })}
          />
        </Section>

        <Section title="Lịch cố định trong tuần">
          <FixedScheduleEditor />
        </Section>

        <Section title="Khung giờ một ngày">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu ngày">
              <input type="time" className="k-input" step={1800} value={minToHM(dayStart)} onChange={(e) => e.target.value && setDay({ day_start_min: hmToMin(e.target.value) })} />
            </Field>
            <Field label="Kết thúc ngày">
              <input type="time" className="k-input" step={1800} value={minToHM(dayEnd)} onChange={(e) => e.target.value && setDay({ day_end_min: hmToMin(e.target.value) })} />
            </Field>
          </div>
          <p className="mt-2 text-[13px] text-muted">Dòng thời gian ở màn Hôm nay chỉ hiện và xếp việc trong khoảng này.</p>
        </Section>

        <Section title="Cài Kairos như một app">
          {installed ? (
            <p className="text-sm text-ink">Kairos đã được cài trên thiết bị này. 🌱</p>
          ) : canInstall ? (
            <>
              <p className="mb-3 text-sm text-muted">Cài để mở Kairos trong cửa sổ riêng, có biểu tượng trên màn hình chính hoặc Desktop.</p>
              <Button onClick={() => void promptInstall()}>
                <Download size={18} /> Cài Kairos
              </Button>
            </>
          ) : isIOS() ? (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink">
              <li>Mở trang này bằng <b>Safari</b>.</li>
              <li>
                Bấm nút <b>Chia sẻ</b> <Share size={15} className="-mt-1 inline" /> ở thanh dưới.
              </li>
              <li>Chọn <b>Thêm vào MH chính</b> rồi bấm <b>Thêm</b>.</li>
              <li className="text-muted">Cần iOS 16.4 trở lên và phải cài theo cách này thì sau này mới nhận được thông báo.</li>
            </ol>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Trên Chrome hoặc Edge: bấm biểu tượng cài đặt ở cuối thanh địa chỉ, hoặc mở menu ⋮ → <b>Cài đặt Kairos / Thêm vào màn hình chính</b>. Nút cài chỉ hiện khi mở app qua địa chỉ https đã deploy.
            </p>
          )}
        </Section>

        <Section title="Thông báo">
          <p className="text-sm leading-relaxed text-muted">Tóm tắt buổi sáng, nhắc viết nhật ký và nhắc deadline trước 7, 3, 1 ngày sẽ có ở giai đoạn 4.</p>
        </Section>

        <Section title="Tài khoản">
          {mode === 'demo' ? (
            <>
              <p className="text-sm leading-relaxed text-muted">Bạn đang xem thử. Dữ liệu mẫu chỉ nằm trên máy này và không cần tài khoản.</p>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="soft"
                  onClick={() => {
                    st.resetDemo(false);
                    st.toast('Đã nạp lại dữ liệu mẫu', 'success');
                  }}
                >
                  <RotateCcw size={18} /> Nạp lại dữ liệu mẫu
                </Button>
                <Button variant="outline" onClick={() => window.confirm('Xóa dữ liệu mẫu và thử lại phần khởi đầu từ bước 1?') && st.resetDemo(true)}>
                  Thử phần khởi đầu (onboarding) từ đầu
                </Button>
                <Button variant="outline" onClick={() => void st.signOut()}>
                  <LogOut size={18} /> Thoát chế độ xem thử
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink">{email ?? 'Đã đăng nhập'}</p>
              <Button variant="outline" className="mt-3" onClick={() => void st.signOut()}>
                <LogOut size={18} /> Đăng xuất
              </Button>
            </>
          )}
        </Section>

        <p className="pb-4 text-center text-xs text-muted">Kairos · bản giai đoạn 1 · Focus on what matters</p>
      </div>
    </div>
  );
}
