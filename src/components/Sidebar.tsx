import React from 'react';
import { ActiveTab } from '../types';
import { 
  ShoppingCart, 
  Package, 
  ReceiptText, 
  BarChart3, 
  Settings,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartItemCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  cartItemCount = 0,
  lowStockCount = 0,
}) => {
  const menuItems = [
    {
      id: 'pos' as ActiveTab,
      label: 'Bán Hàng POS',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : null,
      badgeColor: 'bg-emerald-600 text-white',
      shortcut: 'F2',
    },
    {
      id: 'products' as ActiveTab,
      label: 'Sản Phẩm',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} sắp hết` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
      shortcut: 'F4',
    },
    {
      id: 'orders' as ActiveTab,
      label: 'Đơn Hàng',
      icon: ReceiptText,
      shortcut: 'F6',
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Doanh Thu',
      icon: BarChart3,
      shortcut: 'F8',
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Cài Đặt',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none hidden lg:flex">
      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Menu Quản Trị
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.shortcut && !isActive && (
                  <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                    {item.shortcut}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center">
          <span>Hệ thống:</span>
          <span className="font-mono text-emerald-400 font-semibold">Gia Bảo PC</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span>Cơ sở dữ liệu:</span>
          <span className="text-emerald-400">Firebase Firestore</span>
        </div>
      </div>
    </aside>
  );
};
