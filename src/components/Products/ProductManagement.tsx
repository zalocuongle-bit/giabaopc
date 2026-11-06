import React, { useState, useMemo, useRef } from 'react';
import { Product } from '../../types';
import { formatVND, formatNumber, generateBarcode } from '../../utils/formatters';
import {
  exportProductsToExcel,
  generateSampleExcelTemplate,
  parseProductsFromExcel,
  ParsedProductRow,
} from '../../utils/excel';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsBatch,
  clearAllProducts,
  reloadCctvSampleProducts,
} from '../../services/productService';
import {
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  ArrowUpDown,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
} from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  onRefreshProducts: () => void;
}

const CCTV_DEFAULT_CATEGORIES = [
  'Camera CCTV',
  'Máy In & Mực In',
  'Máy Tính & Laptop',
  'Thiết Bị Mạng',
  'Linh Kiện & Phụ Kiện',
  'Dịch Vụ & Lắp Đặt',
];

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  onRefreshProducts,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isResettingSample, setIsResettingSample] = useState<boolean>(false);
  const [isClearingProducts, setIsClearingProducts] = useState<boolean>(false);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'Camera CCTV',
    costPrice: 0,
    sellingPrice: 0,
    stock: 10,
    minStock: 3,
    unit: 'Chiếc',
    imageUrl: '',
    description: '',
  });

  // Excel Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importedRows, setImportedRows] = useState<ParsedProductRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Stock Edit modal state
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [stockAddAmount, setStockAddAmount] = useState<number>(10);

  // Categories list (defaults prioritized)
  const categories = useMemo(() => {
    const set = new Set<string>(CCTV_DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered list
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term));

      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

      let matchStock = true;
      if (stockFilter === 'out') matchStock = p.stock <= 0;
      if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= (p.minStock || 3);

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: generateBarcode(),
      category: 'Camera CCTV',
      costPrice: 0,
      sellingPrice: 0,
      stock: 10,
      minStock: 3,
      unit: 'Chiếc',
      imageUrl: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      barcode: p.barcode || '',
      category: p.category || 'Camera CCTV',
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      stock: p.stock || 0,
      minStock: p.minStock || 3,
      unit: p.unit || 'Chiếc',
      imageUrl: p.imageUrl || '',
      description: p.description || '',
    });
    setIsModalOpen(true);
  };

  // Reload CCTV & Computer Sample Data
  const handleReloadCctvSample = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn nạp lại bộ sản phẩm mẫu cho Camera CCTV, Máy Tính & Máy In?'
      )
    ) {
      return;
    }

    setIsResettingSample(true);
    try {
      await reloadCctvSampleProducts();
      onRefreshProducts();
      alert('Đã nạp thành công dữ liệu mẫu!');
    } catch (err) {
      alert('Lỗi nạp dữ liệu mẫu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsResettingSample(false);
    }
  };

  // Clear all products (wipe all sample or existing products)
  const handleClearAllProducts = async () => {
    if (products.length === 0) return;
    if (
      !confirm(
        `XÁC NHẬN: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${products.length} sản phẩm? Sau khi xóa, kho hàng sẽ hoàn toàn trống để bạn tự thêm hoặc nhập Excel từ đầu.`
      )
    ) {
      return;
    }

    setIsClearingProducts(true);
    try {
      await clearAllProducts();
      onRefreshProducts();
      alert('Đã xóa sạch toàn bộ sản phẩm khỏi hệ thống!');
    } catch (err) {
      alert('Lỗi khi xóa sản phẩm: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsClearingProducts(false);
    }
  };

  // Save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          barcode: formData.barcode.trim() || generateBarcode(),
          category: formData.category.trim() || 'Khác',
          costPrice: Number(formData.costPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 5,
          unit: formData.unit.trim() || 'Cái',
          imageUrl: formData.imageUrl.trim() || undefined,
          description: formData.description.trim() || undefined,
        });
      } else {
        await createProduct({
          name: formData.name.trim(),
          barcode: formData.barcode.trim() || generateBarcode(),
          category: formData.category.trim() || 'Khác',
          costPrice: Number(formData.costPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 5,
          unit: formData.unit.trim() || 'Cái',
          imageUrl: formData.imageUrl.trim() || undefined,
          description: formData.description.trim() || undefined,
        });
      }

      setIsModalOpen(false);
      onRefreshProducts();
    } catch (err) {
      alert('Lỗi lưu sản phẩm: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" khỏi kho?`)) {
      try {
        await deleteProduct(id);
        onRefreshProducts();
      } catch (err) {
        alert('Lỗi khi xóa sản phẩm: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  // Quick Stock Add
  const handleQuickStockUpdate = async () => {
    if (!quickStockProduct) return;
    const newStock = Math.max(0, quickStockProduct.stock + stockAddAmount);
    try {
      await updateProduct(quickStockProduct.id, { stock: newStock });
      setQuickStockProduct(null);
      onRefreshProducts();
    } catch (err) {
      alert('Lỗi cập nhật tồn kho: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle Excel File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccessMsg('');
    const res = await parseProductsFromExcel(file);
    setImportedRows(res.products);
    setImportErrors(res.errors);
  };

  // Execute Excel Import to Firestore
  const handleConfirmExcelImport = async () => {
    if (importedRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await importProductsBatch(importedRows, products);
      setImportSuccessMsg(
        `Thành công! Đã thêm mới ${result.added} sản phẩm và cập nhật ${result.updated} sản phẩm.`
      );
      setImportedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefreshProducts();
    } catch (err) {
      alert('Lỗi khi nhập dữ liệu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-100 flex flex-col space-y-4">
      {/* Top Banner & Main Actions */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center space-x-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>Quản Lý Sản Phẩm & Kho Hàng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng: <strong className="text-slate-700">{products.length}</strong> sản phẩm •{' '}
            <span className="text-amber-600 font-semibold">
              {products.filter((p) => p.stock > 0 && p.stock <= (p.minStock || 5)).length} sắp hết hàng
            </span>{' '}
            •{' '}
            <span className="text-rose-600 font-semibold">
              {products.filter((p) => p.stock <= 0).length} hết hàng
            </span>
          </p>
        </div>

        {/* Action Buttons: Add, Excel Export, Excel Import, Clear All Products */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clear All Products */}
          {products.length > 0 && (
            <button
              onClick={handleClearAllProducts}
              disabled={isClearingProducts}
              title="Xóa sạch toàn bộ sản phẩm trong kho (làm sạch dữ liệu mẫu)"
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>{isClearingProducts ? 'Đang xóa...' : 'Xóa tất cả sản phẩm'}</span>
            </button>
          )}

          {/* Export Excel */}
          <button
            onClick={() => exportProductsToExcel(products)}
            title="Xuất danh sách sản phẩm ra tệp tin Excel (.xlsx)"
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={() => {
              setImportedRows([]);
              setImportErrors([]);
              setImportSuccessMsg('');
              setIsImportModalOpen(true);
            }}
            title="Nhập dữ liệu sản phẩm từ tệp tin Excel"
            className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Nhập Excel</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên SP hoặc mã vạch..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả danh mục ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái kho</option>
            <option value="low">Sắp hết hàng (Dưới định mức)</option>
            <option value="out">Đã hết hàng (0)</option>
          </select>

          <button
            onClick={onRefreshProducts}
            title="Tải lại dữ liệu"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4">Mã vạch</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4 text-right">Giá vốn</th>
                <th className="py-3 px-4 text-right">Giá bán</th>
                <th className="py-3 px-4 text-center">Tồn kho</th>
                <th className="py-3 px-4 text-center">ĐVT</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-600">Không có sản phẩm nào phù hợp</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thử xóa bộ lọc tìm kiếm hoặc thêm sản phẩm mới.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= (p.minStock || 5);
                  const marginPercent =
                    p.sellingPrice > 0
                      ? Math.round(((p.sellingPrice - (p.costPrice || 0)) / p.sellingPrice) * 100)
                      : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs leading-snug">
                              {p.name}
                            </span>
                            {p.description && (
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {p.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {p.barcode || '---'}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-200">
                          {p.category || 'Khác'}
                        </span>
                      </td>

                      {/* Cost price */}
                      <td className="py-3 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                        {formatVND(p.costPrice)}
                      </td>

                      {/* Selling price */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {formatVND(p.sellingPrice)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Lãi ~{marginPercent}%
                        </span>
                      </td>

                      {/* Stock count */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setQuickStockProduct(p);
                            setStockAddAmount(10);
                          }}
                          title="Bấm để nhập thêm hàng nhanh"
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-transform hover:scale-105 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{p.stock}</span>
                          <span className="text-[10px] text-slate-400 underline decoration-dotted ml-1">
                            +Nhập
                          </span>
                        </button>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {p.unit || 'Cái'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Chỉnh sửa sản phẩm"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="Xóa sản phẩm"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editingProduct ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Mới Vào Kho'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Camera IP Wifi Ezviz C6N 2K+, Máy in Canon LBP 2900, SSD NVMe 500GB..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Barcode and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Mã vạch / Serial</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: generateBarcode() })}
                      className="text-[10px] text-emerald-600 hover:underline"
                    >
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Mã vạch hoặc số Serial..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Danh mục sản phẩm</label>
                  <input
                    type="text"
                    list="categorySuggestions"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Camera CCTV, Máy In & Mực In..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <datalist id="categorySuggestions">
                    <option value="Camera CCTV" />
                    <option value="Máy In & Mực In" />
                    <option value="Máy Tính & Laptop" />
                    <option value="Thiết Bị Mạng" />
                    <option value="Linh Kiện & Phụ Kiện" />
                    <option value="Dịch Vụ & Lắp Đặt" />
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Prices: Cost and Selling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giá vốn (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Giá bán lẻ (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock and Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số lượng tồn kho</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock || ''}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cảnh báo tồn tối thiểu</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStock || ''}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) || 3 })}
                    placeholder="3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    list="unitSuggestions"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Chiếc, Bộ, Hộp..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <datalist id="unitSuggestions">
                    <option value="Chiếc" />
                    <option value="Bộ" />
                    <option value="Hộp" />
                    <option value="Thanh" />
                    <option value="Cuộn" />
                    <option value="Cái" />
                    <option value="Ram" />
                    <option value="Chai" />
                    <option value="Mét" />
                    <option value="Lần" />
                  </datalist>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Link hình ảnh (URL)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Description & Warranty */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả & Thời hạn bảo hành</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Thông số kỹ thuật, thời hạn BH (VD: Bảo hành 24 tháng chính hãng, Serial/MAC...)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Modal footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL IMPORT */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800 text-base">
                  Nhập Danh Sách Sản Phẩm Từ Excel (.xlsx)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Instructions and Sample download */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-emerald-900">Chưa có file mẫu Excel?</p>
                  <p className="text-[11px] text-emerald-700">
                    Tải file mẫu chuẩn về máy, điền thông tin các cột rồi tải lên hệ thống.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateSampleExcelTemplate}
                  className="px-3 py-2 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-bold flex items-center space-x-1.5 shrink-0 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file mẫu Excel</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excelFileInput"
                />
                <label
                  htmlFor="excelFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="font-bold text-slate-700 text-sm">
                    Chọn tệp tin Excel (.xlsx, .xls, .csv)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Hỗ trợ file Excel chứa danh sách sản phẩm với các cột: Tên SP, Barcode, Danh mục, Giá vốn, Giá bán, Tồn kho...
                  </span>
                </label>
              </div>

              {/* Success Notification */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl flex items-center space-x-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Errors list if any */}
              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-1">
                  <p className="font-bold">Lưu ý khi đọc file:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {importErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importErrors.length > 5 && <li>...và {importErrors.length - 5} cảnh báo khác.</li>}
                  </ul>
                </div>
              )}

              {/* Preview table of parsed products */}
              {importedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">
                      Xem trước dữ liệu ({importedRows.length} sản phẩm hợp lệ):
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2">Tên sản phẩm</th>
                          <th className="p-2">Barcode</th>
                          <th className="p-2">Danh mục</th>
                          <th className="p-2 text-right">Giá bán</th>
                          <th className="p-2 text-center">Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importedRows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium">{row.name}</td>
                            <td className="p-2 font-mono text-slate-500">{row.barcode || '(Tự tạo)'}</td>
                            <td className="p-2">{row.category}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">
                              {formatVND(row.sellingPrice)}
                            </td>
                            <td className="p-2 text-center">{row.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Nếu mã vạch trùng khớp với SP đã có, hệ thống sẽ tự động cập nhật giá và tồn kho.
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExcelImport}
                  disabled={importedRows.length === 0 || isImporting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
                >
                  {isImporting ? <span>Đang nhập dữ liệu...</span> : <span>Xác nhận nhập kho ({importedRows.length})</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Nhập Hàng Nhanh
            </h3>
            <p className="text-xs text-slate-500 mb-3 truncate">
              {quickStockProduct.name} (Tồn hiện tại: <strong>{quickStockProduct.stock}</strong>)
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng nhập thêm:
                </label>
                <input
                  type="number"
                  value={stockAddAmount || ''}
                  onChange={(e) => setStockAddAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-1.5">
                {[5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStockAddAmount(amt)}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex justify-between font-semibold">
                <span>Tồn kho sau khi nhập:</span>
                <span className="text-emerald-700 text-sm">
                  {quickStockProduct.stock + stockAddAmount} {quickStockProduct.unit}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickStockProduct(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleQuickStockUpdate}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                >
                  Xác nhận nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
