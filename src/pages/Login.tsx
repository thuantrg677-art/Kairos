// Màn chào + đăng nhập: Google, email/mật khẩu, hoặc xem thử với dữ liệu mẫu.

import { useState, type FormEvent } from 'react';
import { Eye, LogIn, Sprout } from 'lucide-react';
import { useStore } from '@/lib/store';
import { authErrorMessage, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Scenery } from '@/components/Scenery';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const google = async () => {
    if (!supabase) return;
    setError('');
    setBusy(true);
    // Google sẽ đưa người dùng quay lại đúng địa chỉ app đang mở
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) {
      setError(authErrorMessage(error.message));
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setNotice('');
    if (!email.trim() || password.length < 6) return setError('Nhập email và mật khẩu (ít nhất 6 ký tự).');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(authErrorMessage(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (error) setError(authErrorMessage(error.message));
        else if (!data.session) setNotice('Đã tạo tài khoản. Hãy mở email và bấm vào đường link xác nhận, sau đó quay lại đăng nhập.');
      }
    } catch (err) {
      setError(authErrorMessage(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Scenery theme="tan-rung" className="absolute inset-x-0 top-0 h-[46dvh] w-full" />
      <div className="safe-top relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8">
        <div className="flex flex-1 flex-col items-center justify-end pt-8 pb-5" style={{ minHeight: '24dvh' }}>
          <img src="/icons/logo-full.png" alt="Kairos – Focus on what matters" className="h-36 w-auto rounded-[24px] shadow-xl shadow-black/10" draggable={false} />
        </div>

        <div className="k-fade-in rounded-[28px] border border-line bg-surface p-5 shadow-xl shadow-black/5">
          <h1 className="text-xl font-bold text-ink">{mode === 'signin' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản Kairos'}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">Tập trung vào 20% việc tạo ra 80% kết quả, mỗi 12 tuần một chặng.</p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-2xl bg-highsoft px-3 py-2.5 text-sm leading-snug text-high">
              App chưa được nối với Supabase nên chưa đăng nhập được. Bạn vẫn có thể xem thử toàn bộ giao diện với dữ liệu mẫu.
            </p>
          )}

          <Button variant="outline" size="lg" className="mt-4 w-full" onClick={google} disabled={!isSupabaseConfigured || busy}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2 text-sm font-bold">G</span>
            Tiếp tục với Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> hoặc dùng email <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input className="k-input" type="email" autoComplete="email" inputMode="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isSupabaseConfigured} />
            <input
              className="k-input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Mật khẩu (ít nhất 6 ký tự)"
              aria-label="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isSupabaseConfigured}
            />
            {error && <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
            {notice && <p className="rounded-2xl bg-soft px-3 py-2 text-sm font-medium text-ink">{notice}</p>}
            <Button type="submit" size="lg" disabled={!isSupabaseConfigured || busy}>
              {mode === 'signin' ? <LogIn size={18} /> : <Sprout size={18} />}
              {busy ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </form>

          <button
            type="button"
            className="mt-3 min-h-11 w-full text-sm font-semibold text-primary"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setNotice('');
            }}
          >
            {mode === 'signin' ? 'Chưa có tài khoản? Tạo tài khoản mới' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>

        <Button variant="ghost" className="mt-4" onClick={() => useStore.getState().enterDemo()}>
          <Eye size={18} /> Xem thử với dữ liệu mẫu
        </Button>
      </div>
    </div>
  );
}
