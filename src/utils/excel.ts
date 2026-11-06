import * as XLSX from 'xlsx';
import { Product, Order } from '../types';

export function exportProductsToExcel(products: Product[], filename?: string) {
  const exportData = products.map((p, index) => ({
    'STT': index + 1,
    'Mã sản phẩm / Barcode': p.barcode || '',
    'Tên sản phẩm': p.name || '',
    'Danh mục': p.category || 'Khác',
    'Giá vốn (VNĐ)': p.costPrice || 0,
    'Giá bán (VNĐ)': p.sellingPrice || 0,
    'Tồn kho': p.stock || 0,
    'Cảnh báo tồn tối thiểu': p.minStock || 5,
    'Đơn vị tính': p.unit || 'Cái',
    'Mô tả': p.description || '',
    'Ngày tạo': p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Barcode
    { wch: 32 }, // Tên SP
    { wch: 18 }, // Danh mục
    { wch: 16 }, // Giá vốn
    { wch: 16 }, // Giá bán
    { wch: 12 }, // Tồn kho
    { wch: 18 }, // Cảnh báo tồn
    { wch: 14 }, // Đơn vị tính
    { wch: 30 }, // Mô tả
    { wch: 14 }, // Ngày tạo
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản phẩm');

  const defaultName = filename || `Danh_Sach_San_Pham_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, defaultName);
}

export function generateSampleExcelTemplate() {
  const sampleData = [
    {
      'Mã sản phẩm / Barcode': '8938001001011',
      'Tên sản phẩm': 'Camera IP Wifi Ezviz C6N 1080P Xoay 360°',
      'Danh mục': 'Camera CCTV',
      'Giá vốn (VNĐ)': 380000,
      'Giá bán (VNĐ)': 550000,
      'Tồn kho': 20,
      'Cảnh báo tồn tối thiểu': 5,
      'Đơn vị tính': 'Chiếc',
      'Mô tả': 'Camera trong nhà đàm thoại 2 chiều báo động',
    },
    {
      'Mã sản phẩm / Barcode': '8938001002018',
      'Tên sản phẩm': 'Hộp Mực Máy In Canon 2900 (Cartridge 12A/303)',
      'Danh mục': 'Máy In & Mực In',
      'Giá vốn (VNĐ)': 85000,
      'Giá bán (VNĐ)': 160000,
      'Tồn kho': 35,
      'Cảnh báo tồn tối thiểu': 10,
      'Đơn vị tính': 'Hộp',
      'Mô tả': 'Hộp mực mới 100% in đậm nét 2000 trang',
    },
    {
      'Mã sản phẩm / Barcode': '8938001003015',
      'Tên sản phẩm': 'Ổ Cứng SSD Kingston NV2 500GB NVMe M.2',
      'Danh mục': 'Máy Tính & Laptop',
      'Giá vốn (VNĐ)': 890000,
      'Giá bán (VNĐ)': 1190000,
      'Tồn kho': 15,
      'Cảnh báo tồn tối thiểu': 4,
      'Đơn vị tính': 'Chiếc',
      'Mô tả': 'Chuẩn PCIe 4.0 tốc độ cao bảo hành 36T',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 35 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Nhap_San_Pham');
  XLSX.writeFile(workbook, 'Mau_Nhap_File_San_Pham_POS.xlsx');
}

export interface ParsedProductRow {
  barcode?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  description?: string;
}

export async function parseProductsFromExcel(file: File): Promise<{
  products: ParsedProductRow[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          resolve({ products: [], errors: ['Tệp Excel trống, không tìm thấy dữ liệu.'] });
          return;
        }

        const products: ParsedProductRow[] = [];
        const errors: string[] = [];

        jsonRows.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1

          // Flexible header matching helper
          const findVal = (possibleKeys: string[]): unknown => {
            for (const key of possibleKeys) {
              for (const rowKey of Object.keys(row)) {
                if (rowKey.toLowerCase().replace(/[\s\-_/\\()]/g, '') === key.toLowerCase().replace(/[\s\-_/\\()]/g, '')) {
                  return row[rowKey];
                }
              }
            }
            return undefined;
          };

          const name = String(findVal(['Tên sản phẩm', 'Ten san pham', 'Tên SP', 'ProductName', 'Name']) || '').trim();
          if (!name) {
            errors.push(`Dòng ${rowNum}: Bỏ qua vì thiếu Tên sản phẩm.`);
            return;
          }

          const barcodeRaw = findVal(['Mã sản phẩm / Barcode', 'Mã sản phẩm', 'Mã SP', 'Barcode', 'Mã vạch', 'Code']);
          const barcode = barcodeRaw !== undefined && barcodeRaw !== '' ? String(barcodeRaw).trim() : '';

          const category = String(findVal(['Danh mục', 'Danh muc', 'Category', 'Loại', 'Nhóm hàng']) || 'Khác').trim();

          const rawSellingPrice = findVal(['Giá bán (VNĐ)', 'Giá bán', 'Gia ban', 'SellingPrice', 'Price', 'Đơn giá']);
          const sellingPrice = Number(rawSellingPrice) || 0;

          const rawCostPrice = findVal(['Giá vốn (VNĐ)', 'Giá vốn', 'Gia von', 'CostPrice', 'Cost']);
          const costPrice = Number(rawCostPrice) || Math.round(sellingPrice * 0.7);

          const rawStock = findVal(['Tồn kho', 'Ton kho', 'Stock', 'Số lượng', 'Quantity']);
          const stock = Number(rawStock) || 0;

          const rawMinStock = findVal(['Cảnh báo tồn tối thiểu', 'Tồn tối thiểu', 'MinStock', 'Ngưỡng tồn']);
          const minStock = Number(rawMinStock) || 5;

          const unit = String(findVal(['Đơn vị tính', 'Đơn vị', 'Don vi tinh', 'Unit']) || 'Cái').trim();
          const description = String(findVal(['Mô tả', 'Mo ta', 'Description', 'Ghi chú']) || '').trim();

          products.push({
            barcode,
            name,
            category,
            costPrice,
            sellingPrice,
            stock,
            minStock,
            unit,
            description,
          });
        });

        resolve({ products, errors });
      } catch (err) {
        resolve({
          products: [],
          errors: [`Lỗi khi đọc file Excel: ${err instanceof Error ? err.message : String(err)}`],
        });
      }
    };

    reader.onerror = () => {
      resolve({ products: [], errors: ['Không thể đọc tệp tin đã chọn.'] });
    };

    reader.readAsArrayBuffer(file);
  });
}

export function exportOrdersReportToExcel(orders: Order[], periodName: string = 'Toan_Bo') {
  const exportData = orders.map((o, idx) => ({
    'STT': idx + 1,
    'Mã đơn hàng': o.orderNumber,
    'Thời gian': new Date(o.createdAt).toLocaleString('vi-VN'),
    'Khách hàng': o.customerName || 'Khách lẻ',
    'Số điện thoại': o.customerPhone || '',
    'Thu ngân': o.cashierName || 'Admin',
    'Số lượng món': o.items.reduce((sum, it) => sum + it.quantity, 0),
    'Chi tiết SP': o.items.map(it => `${it.name} (x${it.quantity})`).join(', '),
    'Tổng tiền hàng (VNĐ)': o.subtotal,
    'Giảm giá (VNĐ)': o.discount,
    'Thực thu (VNĐ)': o.total,
    'Tiền vốn (VNĐ)': o.costTotal || 0,
    'Lợi nhuận (VNĐ)': o.profit || 0,
    'Phương thức': o.paymentMethod === 'cash' ? 'Tiền mặt' : o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ',
    'Trạng thái': o.status === 'completed' ? 'Hoàn thành' : 'Đã hủy',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 40 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo bán hàng');
  XLSX.writeFile(workbook, `Bao_Cao_Doanh_Thu_${periodName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
