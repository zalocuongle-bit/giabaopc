import React, { useEffect } from 'react';
import { Order, StoreSettings } from '../../types';
import { PrintableReceipt } from './PrintableReceipt';
import { Printer, X, CheckCircle, RefreshCw } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
  autoPrint = false,
}) => {
  const [format, setFormat] = React.useState<'K80' | 'K57' | 'A4'>(settings.printerFormat || 'K80');

  useEffect(() => {
    if (isOpen && autoPrint && order) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, order]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentSettings: StoreSettings = {
    ...settings,
    printerFormat: format,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Header (hidden when printing) */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Hóa Đơn Bán Hàng</h3>
              <p className="text-xs text-slate-500">Mã: {order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size selector toolbar (hidden when printing) */}
        <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs print:hidden">
          <span className="font-medium text-slate-600">Khổ giấy in:</span>
          <div className="flex space-x-1.5 bg-white p-1 rounded-lg border border-slate-200">
            {(['K80', 'K57', 'A4'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  format === fmt
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {fmt === 'K80' ? 'K80 (80mm)' : fmt === 'K57' ? 'K57 (58mm)' : 'Khổ A4'}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 flex justify-center">
          <PrintableReceipt order={order} settings={currentSettings} previewMode />
        </div>

        {/* Action Buttons (hidden when printing) */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>In hóa đơn (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
