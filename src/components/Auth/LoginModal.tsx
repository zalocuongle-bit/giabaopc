import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Store, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState<string>('giabaopc');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const res = await loginWithEmail(username, password);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    const res = await loginWithGoogle();
    setIsSubmitting(false);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Không thể đăng nhập bằng tài khoản Google.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">GIA BẢO PC</h1>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            Hệ Thống Quản Lý Bán Hàng & Kho Hàng Chuyên Nghiệp
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800">Đăng Nhập Quản Trị</h2>
            <p className="text-xs text-slate-500 mt-0.5">Hệ thống phân quyền quản lý bán hàng</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Username Field */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Tên đăng nhập</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="giabaopc"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium text-sm transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium text-sm transition-all font-mono"
                />
              </div>
            </div>

            {/* Admin Credentials Hint */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span>Tên đăng nhập: </span>
                <strong className="text-slate-800 font-semibold">giabaopc</strong>
                <br />
                <span>Mật khẩu mặc định: </span>
                <strong className="text-slate-800 font-mono">admin123</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  (Có thể đổi mật khẩu mới trong mục Cài Đặt)
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-5">
            <span className="bg-white px-3 text-[11px] text-slate-400 uppercase font-medium">Hoặc</span>
            <div className="absolute inset-0 flex items-center -z-10">
              <div className="w-full border-t border-slate-200" />
            </div>
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2.5 transition-all shadow-2xs hover:border-slate-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập với Google</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
          GIA BẢO PC • Phiên bản 3.2 PRO • Cơ sở dữ liệu Firebase
        </div>
      </div>
    </div>
  );
};

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md">
        <LoginView onSuccess={onClose} />
      </div>
    </div>
  );
};
