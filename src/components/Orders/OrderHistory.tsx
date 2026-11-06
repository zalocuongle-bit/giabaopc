import React, { useState, useMemo } from 'react';
import { Order, StoreSettings } from '../../types';
import { formatVND, formatDateTime } from '../../utils/formatters';
import {
  ReceiptText,
  Search,
  Printer,
  Eye,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  User,
  ShoppingBag,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';
import { clearAllOrders } from '../../services/orderService';

interface OrderHistoryProps {
  orders: Order[];
  onRefreshOrders: () => void;
  onPrintOrder: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  onRefreshOrders,
  onPrintOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isClearingOrders, setIsClearingOrders] = useState<boolean>(false);

  // Clear all orders handler
  const handleClearAllOrders = async () => {
    if (orders.length === 0) return;
    if (
      !confirm(
        `XÁC NHẬN: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${orders.length} đơn hàng trong lịch sử? Thao tác này sẽ xóa sạch dữ liệu mẫu và làm mới toàn bộ báo cáo doanh thu.`
      )
    ) {
      return;
    }

    setIsClearingOrders(true);
    try {
      await clearAllOrders();
      onRefreshOrders();
      alert('Đã xóa toàn bộ đơn hàng thành công!');
    } catch (err) {
      alert('Lỗi xóa đơn hàng: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsClearingOrders(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return orders.filter((o) => {
      const matchSearch =
        !term ||
        o.orderNumber.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.customerPhone && o.customerPhone.includes(term)) ||
        (o.cashierName && o.cashierName.toLowerCase().includes(term));

      const matchMethod = methodFilter === 'all' || o.paymentMethod === methodFilter;

      return matchSearch && matchMethod;
    });
  }, [orders, searchTerm, methodFilter]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-100 flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
            <ReceiptText className="w-6 h-6 text-emerald-600" />
            <span>Lịch Sử Đơn Hàng & Hóa Đơn</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng: <strong className="text-slate-800">{filteredOrders.length}</strong> đơn hàng • Doanh thu lọc:{' '}
            <strong className="text-emerald-700 font-bold">{formatVND(totalRevenue)}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {orders.length > 0 && (
            <button
              onClick={handleClearAllOrders}
              disabled={isClearingOrders}
              title="Xóa toàn bộ đơn hàng trong lịch sử (làm sạch dữ liệu mẫu)"
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>{isClearingOrders ? 'Đang xóa...' : 'Xóa toàn bộ đơn hàng'}</span>
            </button>
          )}

          <button
            onClick={onRefreshOrders}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã HĐ, tên khách, SĐT..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả phương thức</option>
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản (VietQR)</option>
            <option value="card">Thẻ POS</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã hóa đơn</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4 text-center">Số lượng</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-center">Thanh toán</th>
                <th className="py-3 px-4">Thu ngân</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ReceiptText className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-600">Chưa có đơn hàng nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Đơn hàng thanh toán tại quầy POS sẽ hiển thị ở đây.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {order.orderNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 block">
                          {order.customerName || 'Khách lẻ'}
                        </span>
                        {order.customerPhone && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Item count */}
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                          {itemCount} món
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {formatVND(order.total)}
                        </span>
                        {order.discount > 0 && (
                          <span className="text-[10px] text-slate-400 block line-through">
                            {formatVND(order.subtotal)}
                          </span>
                        )}
                      </td>

                      {/* Payment method */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            order.paymentMethod === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.paymentMethod === 'transfer'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {order.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                          {order.paymentMethod === 'transfer' && <QrCode className="w-3 h-3" />}
                          {order.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                          <span>
                            {order.paymentMethod === 'cash'
                              ? 'Tiền mặt'
                              : order.paymentMethod === 'transfer'
                              ? 'Chuyển khoản'
                              : 'Thẻ'}
                          </span>
                        </span>
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-4 text-slate-600 font-medium text-[11px]">
                        {order.cashierName || 'Admin'}
                      </td>

                      {/* Actions: View detail & Print */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          title="Xem chi tiết đơn hàng"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPrintOrder(order)}
                          title="In lại hóa đơn"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  Chi Tiết Đơn Hàng #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateTime(selectedOrder.createdAt)} • Thu ngân: {selectedOrder.cashierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {/* Customer info */}
              {selectedOrder.customerName && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Khách hàng:</span>
                    <span className="font-bold text-slate-800">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.customerPhone && (
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">SĐT:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {selectedOrder.customerPhone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Sản phẩm</th>
                      <th className="p-2.5 text-center">SL</th>
                      <th className="p-2.5 text-right">Đơn giá</th>
                      <th className="p-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-medium text-slate-800">{it.name}</td>
                        <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-right">{formatVND(it.unitPrice)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          {formatVND(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tổng tiền hàng:</span>
                  <span className="font-medium">{formatVND(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Chiết khấu / Giảm giá:</span>
                    <span>-{formatVND(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-emerald-700 text-base">{formatVND(selectedOrder.total)}</span>
                </div>
                {selectedOrder.paymentMethod === 'cash' && selectedOrder.cashGiven && (
                  <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                    <span>Khách đưa: {formatVND(selectedOrder.cashGiven)}</span>
                    <span>Tiền thối: {formatVND(selectedOrder.changeDue || 0)}</span>
                  </div>
                )}
              </div>

              {/* Order Notes / Warranty */}
              {selectedOrder.notes && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900">
                  <span className="font-bold text-[11px] text-amber-700 block mb-0.5">
                    Ghi chú kỹ thuật & Bảo hành:
                  </span>
                  <p className="whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const o = selectedOrder;
                  setSelectedOrder(null);
                  onPrintOrder(o);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>In lại hóa đơn này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
