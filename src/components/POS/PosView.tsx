import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, StoreSettings, Order } from '../../types';
import { formatVND, formatNumber } from '../../utils/formatters';
import { sound } from '../../utils/sound';
import { createOrder } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Phone,
  Sparkles,
  ShoppingBag,
  Percent,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface PosViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  settings: StoreSettings;
  onOrderCompleted: (order: Order, autoPrint: boolean) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  onRefreshProducts,
  settings,
  onOrderCompleted,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountVal, setDiscountVal] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoPrint, setAutoPrint] = useState<boolean>(settings.autoPrintReceipt);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F9' && cart.length > 0 && !isCheckoutOpen) {
        e.preventDefault();
        openCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen]);

const CCTV_CATEGORIES = [
  'Camera CCTV',
  'Máy In & Mực In',
  'Máy Tính & Laptop',
  'Thiết Bị Mạng',
  'Linh Kiện & Phụ Kiện',
  'Dịch Vụ & Lắp Đặt',
];

  // Extract unique categories, prioritizing CCTV and IT categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    CCTV_CATEGORIES.forEach((c) => {
      if (products.some((p) => p.category === c)) set.add(c);
    });
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term));
      return matchCategory && matchSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  // Add to cart helper
  const addToCart = (product: Product, qty: number = 1) => {
    if (product.stock <= 0) {
      sound.playError();
      return;
    }

    sound.playBeep();

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > product.stock) {
          return prev; // stock limit
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      } else {
        return [...prev, { product, quantity: qty }];
      }
    });
  };

  // Barcode / Enter search submit handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Check exact barcode match first
    const exactBarcode = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    if (exactBarcode) {
      addToCart(exactBarcode);
      setSearchTerm('');
      return;
    }

    // If 1 search match, add it
    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchTerm('');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountVal(0);
    setNotes('');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.product.sellingPrice * it.quantity, 0);
  }, [cart]);

  const costTotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.product.costPrice || 0) * it.quantity, 0);
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * Math.min(100, Math.max(0, discountVal))) / 100);
    }
    return Math.min(subtotal, Math.max(0, discountVal));
  }, [subtotal, discountType, discountVal]);

  const total = Math.max(0, subtotal - calculatedDiscount);
  const profit = total - costTotal;

  const changeDue = Math.max(0, cashGiven - total);

  const openCheckout = () => {
    if (cart.length === 0) return;
    setCashGiven(total);
    setIsCheckoutOpen(true);
  };

  // Submit and create order
  const handleFinalCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const orderItems = cart.map((it) => ({
        productId: it.product.id,
        barcode: it.product.barcode || '',
        name: it.product.name,
        category: it.product.category || 'Khác',
        costPrice: it.product.costPrice || 0,
        unitPrice: it.product.sellingPrice,
        quantity: it.quantity,
        subtotal: it.product.sellingPrice * it.quantity,
      }));

      const newOrder = await createOrder({
        items: orderItems,
        subtotal,
        discount: calculatedDiscount,
        discountPercent: discountType === 'percent' ? discountVal : undefined,
        total,
        costTotal,
        profit,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        cashGiven: paymentMethod === 'cash' ? cashGiven : total,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        notes: notes.trim() || undefined,
        cashierName: user?.displayName || 'Thu ngân',
        cashierId: user?.uid,
        status: 'completed',
      });

      sound.playSuccess();
      clearCart();
      setIsCheckoutOpen(false);
      onRefreshProducts();
      onOrderCompleted(newOrder, autoPrint);
    } catch (err) {
      sound.playError();
      alert('Không thể lưu hóa đơn: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden border-r border-slate-200">
        {/* Search Bar & Barcode input */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quét mã vạch hoặc gõ tên Camera, máy tính, mực in... (F2)"
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Quét / Tìm</span>
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-sm font-medium">Không tìm thấy sản phẩm phù hợp</p>
              <p className="text-xs text-slate-400">Hãy thử từ khóa khác hoặc thêm sản phẩm mới</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= (p.minStock || 5);
                const inCart = cart.find((it) => it.product.id === p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`group relative bg-white border rounded-xl p-2.5 flex flex-col justify-between transition-all select-none cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50'
                        : 'border-slate-200 hover:border-emerald-500 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {/* Badge: In Cart Quantity */}
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                        {inCart.quantity}
                      </span>
                    )}

                    <div>
                      {/* Product Image Thumbnail */}
                      <div className="w-full h-24 bg-slate-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center relative">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingBag className="w-8 h-8 text-slate-300" />
                        )}

                        {/* Stock indicator badge */}
                        <span
                          className={`absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100/90 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'Hết hàng' : `Tồn: ${p.stock} ${p.unit || ''}`}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight min-h-[2rem]">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {p.barcode || 'SP-' + p.id.slice(-4)}
                      </p>
                    </div>

                    {/* Price & Add Action */}
                    <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-emerald-600 text-sm">
                        {formatVND(p.sellingPrice)}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Order Cart */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-full shadow-lg border-l border-slate-200">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Giỏ Hàng ({cart.reduce((s, it) => s + it.quantity, 0)})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center space-x-1 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* Customer Info row */}
        <div className="p-2.5 bg-slate-50/60 border-b border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Tên khách hàng"
              className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Giỏ hàng đang trống</p>
              <p className="text-xs text-slate-400 mt-1">
                Chọn sản phẩm từ danh mục bên trái hoặc quét mã vạch để bắt đầu bán hàng.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {item.product.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                    <span>{formatVND(item.product.sellingPrice)}</span>
                    <span>×</span>
                    <span className="font-semibold text-slate-700">{item.quantity}</span>
                    <span>=</span>
                    <span className="font-bold text-emerald-700">
                      {formatVND(item.product.sellingPrice * item.quantity)}
                    </span>
                  </div>
                </div>

                {/* Quantity adjustments */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-bold text-xs text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 active:scale-95 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount & Calculations Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 space-y-2">
          {/* Discount controls */}
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-medium text-slate-600 flex items-center space-x-1">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              <span>Giảm giá:</span>
            </span>
            <div className="flex items-center space-x-1">
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setDiscountType('amount')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    discountType === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  VNĐ
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    discountType === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={discountVal || ''}
                onChange={(e) => setDiscountVal(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-semibold text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Subtotals breakdown */}
          <div className="space-y-1 pt-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Tổng tiền hàng:</span>
              <span className="font-medium">{formatVND(subtotal)}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Chiết khấu giảm giá:</span>
                <span>-{formatVND(calculatedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>Khách cần trả:</span>
              <span className="text-emerald-600 text-lg">{formatVND(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-sm"
          >
            <span>THANH TOÁN (F9)</span>
            <span className="bg-emerald-800/40 px-2 py-0.5 rounded-lg text-xs font-mono">
              {formatVND(total)}
            </span>
          </button>
        </div>
      </div>

      {/* PAYMENT & CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Xác Nhận Thanh Toán</h3>
                <p className="text-xs text-slate-500">
                  {cart.length} mặt hàng • Tổng thanh toán: {formatVND(total)}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Payment Method Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setCashGiven(total);
                    }}
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1" />
                    <span>Tiền mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1" />
                    <span>Chuyển khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      paymentMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span>Thẻ POS</span>
                  </button>
                </div>
              </div>

              {/* Cash payment specific: quick cash buttons & change due */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Tiền khách đưa:</span>
                      <span className="text-emerald-700 font-bold">{formatVND(cashGiven)}</span>
                    </div>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                      placeholder="Nhập số tiền..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Quick cash pills */}
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCashGiven(total)}
                      className="py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
                    >
                      Đủ tiền
                    </button>
                    {[50000, 100000, 200000, 500000].map((cashVal) => (
                      <button
                        key={cashVal}
                        type="button"
                        onClick={() => setCashGiven(cashVal)}
                        className="py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 font-mono text-[11px]"
                      >
                        {formatNumber(cashVal / 1000)}k
                      </button>
                    ))}
                  </div>

                  {/* Change due */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600">Tiền thừa trả khách:</span>
                    <span
                      className={`text-base font-extrabold ${
                        cashGiven >= total ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {cashGiven >= total
                        ? formatVND(changeDue)
                        : `Còn thiếu ${formatVND(total - cashGiven)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* VietQR Bank Transfer details */}
              {paymentMethod === 'transfer' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-700">MÃ THANH TOÁN VIETQR TỰ ĐỘNG</p>
                  {settings.bankAccount && settings.bankName ? (
                    <div>
                      <img
                        src={`https://img.vietqr.io/image/${settings.bankName}-${settings.bankAccount}-compact2.png?amount=${total}&addInfo=POS-HD&accountName=${encodeURIComponent(
                          settings.bankAccountName || ''
                        )}`}
                        alt="VietQR code"
                        className="w-44 h-44 mx-auto object-contain bg-white p-2 rounded-xl border border-slate-200 shadow-xs"
                      />
                      <div className="text-xs text-slate-600 mt-2">
                        <p className="font-semibold text-slate-800">{settings.bankName}</p>
                        <p className="font-mono text-emerald-700 font-bold">{settings.bankAccount}</p>
                        <p className="text-[11px] uppercase text-slate-500">{settings.bankAccountName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-xs text-slate-500">
                      Chưa cấu hình tài khoản ngân hàng trong Cài đặt.
                    </div>
                  )}
                </div>
              )}

              {/* Card payment note */}
              {paymentMethod === 'card' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-600">
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">Quẹt thẻ qua máy POS ngân hàng</p>
                  <p className="mt-1 text-slate-500">
                    Thu đúng số tiền: <span className="font-bold text-emerald-600">{formatVND(total)}</span>
                  </p>
                </div>
              )}

              {/* Notes / Warranty serial / Installation address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ lắp đặt / Ghi chú bảo hành & Serial:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Lắp đặt tại nhà khách, BH camera 24T, Serial: SN12345..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Auto print checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="autoPrintCheckbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="autoPrintCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Tự động in hóa đơn sau khi hoàn tất
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleFinalCheckout}
                disabled={isSubmitting || (paymentMethod === 'cash' && cashGiven < total)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <span>Hoàn tất & Lưu đơn</span>
                    <span>✓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
