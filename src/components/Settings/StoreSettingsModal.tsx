import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import { saveStoreSettings } from '../../services/settingsService';
import { clearAllProducts } from '../../services/productService';
import { clearAllOrders } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { 
  Store, 
  Printer, 
  CreditCard, 
  ShieldCheck, 
  Save, 
  CheckCircle,
  Lock,
  KeyRound,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface StoreSettingsModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updated: StoreSettings) => void;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const { changePassword } = useAuth();
  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Password reset state
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passError, setPassError] = useState<string>('');
  const [passSuccess, setPassSuccess] = useState<string>('');
  const [isMasterClearing, setIsMasterClearing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveStoreSettings(form);
      setSavedSuccess(true);
      onSaveSuccess(form);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (err) {
      alert('Lỗi lưu cài đặt: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword) {
      setPassError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPassError('Mật khẩu mới phải có từ 4 ký tự trở lên.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsChangingPass(true);
    const res = await changePassword(oldPassword, newPassword);
    setIsChangingPass(false);

    if (res.success) {
      setPassSuccess('Đã đổi mật khẩu thành công! Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 4000);
    } else {
      setPassError(res.error || 'Đổi mật khẩu thất bại.');
    }
  };

  const handleMasterClearData = async () => {
    if (
      !confirm(
        'XÁC NHẬN NGUY HIỂM: Bạn có chắc chắn muốn XÓA SẠCH TOÀN BỘ dữ liệu mẫu (Cả Sản phẩm và Lịch sử đơn hàng)?\n\nHệ thống sẽ hoàn toàn trống dữ liệu để bạn sẵn sàng sử dụng thực tế.'
      )
    ) {
      return;
    }

    setIsMasterClearing(true);
    try {
      await Promise.all([clearAllProducts(), clearAllOrders()]);
      alert('Đã xóa sạch toàn bộ dữ liệu mẫu! Trang sẽ được làm mới.');
      window.location.reload();
    } catch (err) {
      alert('Lỗi xóa dữ liệu: ' + (err instanceof Error ? err.message : String(err)));
      setIsMasterClearing(false);
    }
  };

  const vietnameseBanks = [
    'MBBANK',
    'VIETCOMBANK',
    'TECHCOMBANK',
    'VPBANK',
    'ACB',
    'BIDV',
    'VIETINBANK',
    'TPBANK',
    'VIB',
    'SACOMBANK',
    'HDBANK',
    'SHB',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-800 text-base">Cấu Hình Cửa Hàng & Bảo Mật</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {savedSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl flex items-center space-x-2 font-bold animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu cài đặt cửa hàng thành công!</span>
            </div>
          )}

          {/* FORM 1: Store Information & Printing */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Store Information */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Thông tin cửa hàng (In trên đầu hóa đơn)</span>
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên cửa hàng / Doanh nghiệp</label>
                <input
                  type="text"
                  required
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại / Hotline</label>
                  <input
                    type="text"
                    value={form.storePhone}
                    onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa chỉ cửa hàng</label>
                  <input
                    type="text"
                    value={form.storeAddress}
                    onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lời cảm ơn chân hóa đơn</label>
                <textarea
                  rows={2}
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Printer Setup */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Thiết lập máy in & In hóa đơn tự động</span>
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Khổ giấy in mặc định</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'K80' as const, name: 'Khổ K80 (80mm)', desc: 'Máy in bill nhiệt chuẩn' },
                    { id: 'K57' as const, name: 'Khổ K57 (58mm)', desc: 'Máy in bill mini' },
                    { id: 'A4' as const, name: 'Khổ A4 / A5', desc: 'Máy in văn phòng' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setForm({ ...form, printerFormat: fmt.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        form.printerFormat === fmt.id
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-bold text-xs">{fmt.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="autoPrintReceiptCheck"
                  checked={form.autoPrintReceipt}
                  onChange={(e) => setForm({ ...form, autoPrintReceipt: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="autoPrintReceiptCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Tự động kích hoạt hộp thoại in hóa đơn ngay sau khi bấm Thanh toán
                </label>
              </div>
            </div>

            {/* VietQR Payment Setup */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Cấu hình tài khoản ngân hàng (Sinh mã VietQR tự động)</span>
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngân hàng</label>
                  <select
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {vietnameseBanks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    placeholder="0988xxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value.toUpperCase() })}
                    placeholder="GIA BAO PC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center space-x-1.5 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin cửa hàng'}</span>
              </button>
            </div>
          </form>

          {/* FORM 2: CHANGE PASSWORD */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 pt-4 mt-4 border-t-2 border-t-emerald-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Cài Đặt Lại Mật Khẩu (Tài khoản: giabaopc)</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                giabaopc
              </span>
            </div>

            {passError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại (mặc định: admin123)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới (ít nhất 4 ký tự)..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isChangingPass ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Master Data Cleanup Section */}
          <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-2">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h4 className="font-bold text-rose-900 text-xs">Quản Lý & Làm Sạch Dữ Liệu</h4>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Xóa sạch toàn bộ sản phẩm và đơn hàng mẫu trong cơ sở dữ liệu để bắt đầu nhập và quản lý hàng thực tế.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleMasterClearData}
                disabled={isMasterClearing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isMasterClearing ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu mẫu (Sản phẩm & Đơn hàng)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
