import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreSettings } from '../types';
import { sound } from '../utils/sound';
import { 
  Store, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  LogOut
} from 'lucide-react';

interface NavbarProps {
  settings: StoreSettings;
  onOpenSettings: () => void;
  onOpenLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onOpenSettings,
}) => {
  const { user, logout } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between shadow-xs select-none">
      {/* Brand & Store Name */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800 tracking-tight text-lg">
              Gia Bảo PC
            </span>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              CCTV • Máy Tính • Máy In
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block truncate max-w-xs">
            {settings.storeName || 'Cửa hàng CCTV, Máy Tính & Máy In Gia Bảo PC'}
          </p>
        </div>
      </div>

      {/* Center shortcuts / status */}
      <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
        <span className="font-semibold text-slate-700">Phím tắt:</span>
        <span className="px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-[11px]">F2: Bán Hàng</span>
        <span className="px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-[11px]">F4: Sản Phẩm</span>
        <span className="px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-[11px]">F9: Thanh Toán</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          className={`p-2 rounded-xl border transition-all ${
            soundEnabled
              ? 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200'
              : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* User Account / Profile */}
        <div className="relative">
          {user && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'A'}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user.displayName || 'Quản trị viên'}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 inline" />
                    <span>Admin</span>
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800">{user.displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email || 'Admin session'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors mt-1 flex items-center space-x-2"
                    >
                      <Store className="w-4 h-4 text-slate-500" />
                      <span>Cài đặt cửa hàng & Máy in</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
