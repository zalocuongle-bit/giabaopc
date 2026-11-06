import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { PosView } from './components/POS/PosView';
import { ProductManagement } from './components/Products/ProductManagement';
import { OrderHistory } from './components/Orders/OrderHistory';
import { RevenueReports } from './components/Reports/RevenueReports';
import { StoreSettingsModal } from './components/Settings/StoreSettingsModal';
import { ReceiptModal } from './components/Receipt/ReceiptModal';
import { LoginView } from './components/Auth/LoginModal';
import { Product, Order, StoreSettings, ActiveTab } from './types';
import { getProducts, clearAllProducts } from './services/productService';
import { getOrders, clearAllOrders } from './services/orderService';
import { getStoreSettings, DEFAULT_SETTINGS } from './services/settingsService';
import { Loader2, RefreshCw } from 'lucide-react';

function PosApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptAutoPrint, setReceiptAutoPrint] = useState<boolean>(false);

  // Initial load
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Automatic one-time cleanup of all sample data as requested by user
      const purgeKey = 'pos_sample_data_purged_v1';
      if (!localStorage.getItem(purgeKey)) {
        try {
          await Promise.all([clearAllProducts(), clearAllOrders()]);
          localStorage.setItem(purgeKey, 'true');
        } catch (purgeErr) {
          console.warn('Sample purge error:', purgeErr);
        }
      }

      const [fetchedSettings, fetchedProducts, fetchedOrders] = await Promise.all([
        getStoreSettings(),
        getProducts(),
        getOrders(),
      ]);

      setSettings(fetchedSettings);
      setProducts(fetchedProducts);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu ban đầu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [user, loadInitialData]);

  // Global key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        setActiveTab('pos');
      } else if (e.key === 'F4') {
        setActiveTab('products');
      } else if (e.key === 'F6') {
        setActiveTab('orders');
      } else if (e.key === 'F8') {
        setActiveTab('reports');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reload products
  const handleRefreshProducts = async () => {
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      console.error(err);
    }
  };

  // Reload orders
  const handleRefreshOrders = async () => {
    try {
      const list = await getOrders();
      setOrders(list);
    } catch (err) {
      console.error(err);
    }
  };

  // When order completes in POS
  const handleOrderCompleted = (newOrder: Order, autoPrint: boolean) => {
    setOrders((prev) => [newOrder, ...prev]);
    setReceiptOrder(newOrder);
    setReceiptAutoPrint(autoPrint);
    setIsReceiptOpen(true);
  };

  // Manual print from order history
  const handlePrintOrder = (order: Order) => {
    setReceiptOrder(order);
    setReceiptAutoPrint(true);
    setIsReceiptOpen(true);
  };

  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= (p.minStock || 5)
  ).length;

  // If user is not authenticated, show ONLY the login screen
  if (!user) {
    return <LoginView />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4 animate-bounce">
          <Loader2 className="w-7 h-7 text-slate-950 animate-spin" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Gia Bảo PC</h1>
        <p className="text-xs text-slate-400 mt-1">CCTV • Máy Tính • Máy In — Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Body with Sidebar and Active View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'settings') {
              setIsSettingsOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          lowStockCount={lowStockCount}
        />

        {/* Tab Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden pb-14 lg:pb-0">
          {activeTab === 'pos' && (
            <PosView
              products={products}
              onRefreshProducts={handleRefreshProducts}
              settings={settings}
              onOrderCompleted={handleOrderCompleted}
            />
          )}

          {activeTab === 'products' && (
            <ProductManagement
              products={products}
              onRefreshProducts={handleRefreshProducts}
            />
          )}

          {activeTab === 'orders' && (
            <OrderHistory
              orders={orders}
              onRefreshOrders={handleRefreshOrders}
              onPrintOrder={handlePrintOrder}
            />
          )}

          {activeTab === 'reports' && (
            <RevenueReports orders={orders} products={products} />
          )}
        </main>
      </div>

      {/* Mobile / Tablet Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Store Settings Modal */}
      <StoreSettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSuccess={(updated) => setSettings(updated)}
      />

      {/* Receipt Printing Modal */}
      <ReceiptModal
        order={receiptOrder}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptOrder(null);
        }}
        autoPrint={receiptAutoPrint}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PosApp />
    </AuthProvider>
  );
}
