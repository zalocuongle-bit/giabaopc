import React, { useState, useMemo } from 'react';
import { Order, Product } from '../../types';
import { formatVND, formatNumber, formatDate } from '../../utils/formatters';
import { exportOrdersReportToExcel } from '../../utils/excel';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  Calendar,
  Download,
  CreditCard,
  Banknote,
  QrCode,
  PieChart,
} from 'lucide-react';

interface RevenueReportsProps {
  orders: Order[];
  products: Product[];
}

type Period = 'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'custom' | 'all';

export const RevenueReports: React.FC<RevenueReportsProps> = ({ orders, products }) => {
  const [period, setPeriod] = useState<Period>('7days');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Filter orders according to selected period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;

    return orders.filter((o) => {
      const orderTime = new Date(o.createdAt).getTime();

      switch (period) {
        case 'today':
          return orderTime >= todayStart && orderTime < todayEnd;
        case 'yesterday': {
          const yestStart = todayStart - 86400000;
          return orderTime >= yestStart && orderTime < todayStart;
        }
        case '7days': {
          const weekStart = todayStart - 6 * 86400000;
          return orderTime >= weekStart && orderTime < todayEnd;
        }
        case 'this_month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return orderTime >= monthStart;
        }
        case 'last_month': {
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return orderTime >= lastMonthStart && orderTime < lastMonthEnd;
        }
        case 'custom': {
          const start = new Date(customStart).getTime();
          const end = new Date(customEnd).getTime() + 86400000;
          return orderTime >= start && orderTime < end;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [orders, period, customStart, customEnd]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalCost = filteredOrders.reduce((sum, o) => sum + (o.costTotal || 0), 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.profit || (o.total - (o.costTotal || 0))), 0);
    const totalOrders = filteredOrders.length;
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const totalItems = filteredOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0),
      0
    );

    // Payment methods breakdown
    let cashTotal = 0;
    let transferTotal = 0;
    let cardTotal = 0;
    filteredOrders.forEach((o) => {
      if (o.paymentMethod === 'cash') cashTotal += o.total;
      else if (o.paymentMethod === 'transfer') transferTotal += o.total;
      else cardTotal += o.total;
    });

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrders,
      aov,
      totalItems,
      cashTotal,
      transferTotal,
      cardTotal,
      marginPercent: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0,
    };
  }, [filteredOrders]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; category: string }>();

    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        const key = it.productId || it.name;
        const cur = map.get(key) || {
          name: it.name,
          quantity: 0,
          revenue: 0,
          category: it.category || 'Khác',
        };
        cur.quantity += it.quantity;
        cur.revenue += it.subtotal;
        map.set(key, cur);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredOrders]);

  // Daily revenue grouping for chart
  const dailyData = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; profit: number; count: number }>();

    // Sort ascending for chronology
    const sorted = [...filteredOrders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    sorted.forEach((o) => {
      const dateKey = o.createdAt.slice(0, 10);
      const cur = map.get(dateKey) || {
        label: new Date(dateKey).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: 0,
        profit: 0,
        count: 0,
      };
      cur.revenue += o.total;
      cur.profit += o.profit || (o.total - (o.costTotal || 0));
      cur.count += 1;
      map.set(dateKey, cur);
    });

    return Array.from(map.values());
  }, [filteredOrders]);

  const maxRevenue = useMemo(() => {
    return Math.max(...dailyData.map((d) => d.revenue), 100000);
  }, [dailyData]);

  const handleExport = () => {
    exportOrdersReportToExcel(filteredOrders, period);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-100 flex flex-col space-y-4">
      {/* Top Banner & Export */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>Báo Cáo Doanh Thu & Hiệu Quả Bán Hàng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi doanh thu, tỷ suất lợi nhuận và xu hướng tăng trưởng theo thời gian thực.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel</span>
        </button>
      </div>

      {/* Period Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: 'today' as Period, label: 'Hôm nay' },
            { id: 'yesterday' as Period, label: 'Hôm qua' },
            { id: '7days' as Period, label: '7 ngày qua' },
            { id: 'this_month' as Period, label: 'Tháng này' },
            { id: 'last_month' as Period, label: 'Tháng trước' },
            { id: 'all' as Period, label: 'Tất cả' },
            { id: 'custom' as Period, label: 'Tùy chọn ngày' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                period === item.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {period === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Doanh Thu
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-emerald-700">
            {formatVND(metrics.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Từ {metrics.totalOrders} đơn hàng hoàn tất
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lợi Nhuận Ước Tính
            </span>
            <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-teal-700">
            {formatVND(metrics.totalProfit)}
          </div>
          <p className="text-[11px] text-teal-600 font-semibold mt-1">
            Biên lợi nhuận: ~{metrics.marginPercent}%
          </p>
        </div>

        {/* Total Orders & AOV */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Số Lượng Đơn Hàng
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-blue-800">
            {metrics.totalOrders} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Trung bình đơn (AOV): {formatVND(metrics.aov)}
          </p>
        </div>

        {/* Total Items Sold */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sản Phẩm Đã Bán
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-extrabold text-purple-800">
            {metrics.totalItems} <span className="text-xs font-normal text-slate-500">món</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Toàn bộ danh mục hàng hóa
          </p>
        </div>
      </div>

      {/* Middle Grid: Revenue Timeline Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Biểu Đồ Doanh Thu & Lợi Nhuận
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê số liệu bán hàng theo ngày trong giai đoạn
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span className="text-slate-600">Doanh thu</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-teal-400 inline-block" />
                <span className="text-slate-600">Lợi nhuận</span>
              </div>
            </div>
          </div>

          {dailyData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          ) : (
            <div className="h-60 flex items-end space-x-3 pt-6 pb-2 px-2 overflow-x-auto">
              {dailyData.map((d, idx) => {
                const revHeight = Math.max(12, Math.round((d.revenue / maxRevenue) * 100));
                const profitHeight = Math.max(8, Math.round((d.profit / maxRevenue) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center min-w-[42px] group">
                    {/* Tooltip on hover */}
                    <div className="text-[10px] text-slate-600 font-semibold mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatVND(d.revenue)}
                    </div>

                    {/* Bars container */}
                    <div className="w-full flex justify-center items-end space-x-1 h-44">
                      {/* Revenue Bar */}
                      <div
                        style={{ height: `${revHeight}%` }}
                        className="w-4 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all shadow-xs"
                        title={`Doanh thu: ${formatVND(d.revenue)}`}
                      />
                      {/* Profit Bar */}
                      <div
                        style={{ height: `${profitHeight}%` }}
                        className="w-3 bg-teal-300 rounded-t-md hover:bg-teal-400 transition-all"
                        title={`Lợi nhuận: ${formatVND(d.profit)}`}
                      />
                    </div>

                    {/* X-axis date label */}
                    <span className="text-[10px] text-slate-500 font-medium mt-2">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 Best Sellers (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center space-x-2 mb-3">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-slate-800 text-sm">Top Sản Phẩm Bán Chạy</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Chưa có sản phẩm nào bán ra</p>
            ) : (
              topProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        i === 0
                          ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                          : i === 1
                          ? 'bg-slate-200 text-slate-700'
                          : i === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Đã bán: {p.quantity} món</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-700 block">
                      {formatVND(p.revenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Payment Methods Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-extrabold text-slate-800 text-sm mb-3 flex items-center space-x-2">
          <PieChart className="w-4 h-4 text-emerald-600" />
          <span>Tỷ Trọng Doanh Thu Theo Phương Thức Thanh Toán</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Cash */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Tiền mặt</span>
                <span className="text-[11px] text-slate-400">
                  {metrics.totalRevenue > 0
                    ? `${Math.round((metrics.cashTotal / metrics.totalRevenue) * 100)}% tổng thu`
                    : '0%'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-emerald-800 text-sm">
                {formatVND(metrics.cashTotal)}
              </span>
            </div>
          </div>

          {/* VietQR Bank Transfer */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Chuyển khoản (VietQR)</span>
                <span className="text-[11px] text-slate-400">
                  {metrics.totalRevenue > 0
                    ? `${Math.round((metrics.transferTotal / metrics.totalRevenue) * 100)}% tổng thu`
                    : '0%'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-blue-800 text-sm">
                {formatVND(metrics.transferTotal)}
              </span>
            </div>
          </div>

          {/* POS Card */}
          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Thẻ POS</span>
                <span className="text-[11px] text-slate-400">
                  {metrics.totalRevenue > 0
                    ? `${Math.round((metrics.cardTotal / metrics.totalRevenue) * 100)}% tổng thu`
                    : '0%'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-purple-800 text-sm">
                {formatVND(metrics.cardTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
