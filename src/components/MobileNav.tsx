import React from 'react';
import { ActiveTab } from '../types';
import { ShoppingCart, Package, ReceiptText, BarChart3, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartItemCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  cartItemCount = 0,
}) => {
  const tabs = [
    { id: 'pos' as ActiveTab, label: 'Thu Ngân', icon: ShoppingCart, badge: cartItemCount },
    { id: 'products' as ActiveTab, label: 'Sản Phẩm', icon: Package },
    { id: 'orders' as ActiveTab, label: 'Đơn Hàng', icon: ReceiptText },
    { id: 'reports' as ActiveTab, label: 'Doanh Thu', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'Cài Đặt', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 px-2 py-1 shadow-lg flex justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1 px-3 rounded-lg relative transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
