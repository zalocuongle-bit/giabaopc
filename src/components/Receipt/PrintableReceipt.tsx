import React from 'react';
import { Order, StoreSettings } from '../../types';
import { formatVND, formatDateTime } from '../../utils/formatters';

interface PrintableReceiptProps {
  order: Order;
  settings: StoreSettings;
  previewMode?: boolean;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  order,
  settings,
  previewMode = false,
}) => {
  const isK57 = settings.printerFormat === 'K57';
  const isA4 = settings.printerFormat === 'A4';

  const widthClass = isA4
    ? 'max-w-[700px] w-full p-8 font-sans'
    : isK57
    ? 'w-[58mm] max-w-[240px] p-2 text-xs font-mono'
    : 'w-[80mm] max-w-[320px] p-4 text-xs font-mono';

  // VietQR URL for automatic QR code generation when transferring
  const qrUrl = settings.bankAccount && settings.bankName && order.total > 0
    ? `https://img.vietqr.io/image/${settings.bankName}-${settings.bankAccount}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.orderNumber)}&accountName=${encodeURIComponent(settings.bankAccountName || '')}`
    : null;

  return (
    <div
      id="printable-receipt"
      className={`mx-auto bg-white text-slate-900 border border-slate-200 shadow-sm print:border-none print:shadow-none print:m-0 print:p-0 ${widthClass}`}
      style={{ color: '#000' }}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-slate-400">
        <h1 className="font-extrabold text-base tracking-wide uppercase">
          {settings.storeName || 'CỬA HÀNG BÁN LẺ'}
        </h1>
        {settings.storeAddress && (
          <p className="text-[11px] text-slate-600 print:text-black mt-0.5 leading-tight">
            Đ/C: {settings.storeAddress}
          </p>
        )}
        {settings.storePhone && (
          <p className="text-[11px] text-slate-600 print:text-black leading-tight">
            Hotline: {settings.storePhone}
          </p>
        )}
      </div>

      {/* Invoice Title */}
      <div className="text-center py-2 border-b border-dashed border-slate-400">
        <h2 className="font-bold text-sm tracking-wide">HÓA ĐƠN BÁN HÀNG</h2>
        <div className="text-[11px] text-slate-700 print:text-black space-y-0.5 mt-1">
          <div className="flex justify-between">
            <span>Số HĐ:</span>
            <span className="font-semibold">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Thời gian:</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Thu ngân:</span>
            <span>{order.cashierName || 'Admin'}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span>Khách hàng:</span>
              <span className="font-medium">
                {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="py-2 border-b border-dashed border-slate-400">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 print:border-black font-semibold text-slate-700 print:text-black">
              <th className="text-left pb-1">Tên món</th>
              <th className="text-center pb-1 w-8">SL</th>
              <th className="text-right pb-1">Đ.Giá</th>
              <th className="text-right pb-1">T.Tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-slate-200 print:divide-slate-400">
            {order.items.map((item, idx) => (
              <tr key={idx} className="align-top py-1">
                <td className="py-1 pr-1 font-medium leading-tight">
                  {item.name}
                </td>
                <td className="py-1 text-center font-bold">{item.quantity}</td>
                <td className="py-1 text-right whitespace-nowrap">{formatVND(item.unitPrice).replace('₫', '')}</td>
                <td className="py-1 text-right font-semibold whitespace-nowrap">
                  {formatVND(item.subtotal).replace('₫', '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400">
        <div className="flex justify-between">
          <span>Tổng tiền hàng:</span>
          <span>{formatVND(order.subtotal)}</span>
        </div>

        {order.discount > 0 && (
          <div className="flex justify-between text-emerald-700 print:text-black font-medium">
            <span>Chiết khấu / Giảm giá:</span>
            <span>-{formatVND(order.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 print:border-black">
          <span>THANH TOÁN:</span>
          <span className="text-base font-extrabold">{formatVND(order.total)}</span>
        </div>

        <div className="flex justify-between pt-1">
          <span>Hình thức:</span>
          <span className="font-semibold uppercase">
            {order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}
          </span>
        </div>

        {order.paymentMethod === 'cash' && order.cashGiven !== undefined && (
          <>
            <div className="flex justify-between">
              <span>Tiền khách đưa:</span>
              <span>{formatVND(order.cashGiven)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Tiền thừa trả lại:</span>
              <span>{formatVND(order.changeDue || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* QR Code for bank transfer if paymentMethod is transfer or if store config has bank */}
      {order.paymentMethod === 'transfer' && qrUrl && (
        <div className="text-center py-2 border-b border-dashed border-slate-400">
          <p className="text-[10px] font-semibold mb-1">QUÉT MÃ VIETQR ĐỂ THANH TOÁN</p>
          <img
            src={qrUrl}
            alt="VietQR"
            className="w-36 h-36 mx-auto object-contain border border-slate-200 p-1 bg-white"
            loading="lazy"
          />
          <p className="text-[9px] text-slate-500 print:text-black mt-1">
            {settings.bankName} - STK: {settings.bankAccount}
          </p>
        </div>
      )}

      {/* Notes / Warranty / Serial / Installation remarks */}
      {order.notes && (
        <div className="py-2 border-b border-dashed border-slate-400 text-[11px] text-slate-800 print:text-black">
          <p className="font-bold text-[10px] text-slate-600 uppercase">Ghi chú & Bảo hành:</p>
          <p className="mt-0.5 whitespace-pre-wrap leading-tight">{order.notes}</p>
        </div>
      )}

      {/* Barcode representation */}
      <div className="text-center py-2 border-b border-dashed border-slate-400">
        <div className="font-mono tracking-widest text-[11px] font-bold">
          *{order.orderNumber}*
        </div>
        <div className="h-6 flex items-center justify-center space-x-0.5 mt-0.5">
          {/* Simulated clean barcode lines */}
          {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 2].map((w, i) => (
            <span
              key={i}
              className="inline-block bg-black h-5"
              style={{ width: `${w * 1.5}px` }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 text-[10px] text-slate-600 print:text-black whitespace-pre-line leading-relaxed">
        {settings.receiptFooter || 'Cảm ơn quý khách và hẹn gặp lại!'}
      </div>
    </div>
  );
};
