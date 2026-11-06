import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { generateBarcode } from '../utils/formatters';

const COLLECTION_NAME = 'products';

// Default initial seed data for convenience
export const INITIAL_PRODUCTS: Omit<Product, 'id' | 'createdAt'>[] = [
  {
    barcode: '8938001001011',
    name: 'Camera IP Wifi Ezviz C6N 1080P Xoay 360°',
    category: 'Camera CCTV',
    costPrice: 380000,
    sellingPrice: 550000,
    stock: 24,
    minStock: 5,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&auto=format&fit=crop&q=60',
    description: 'Camera trong nhà đàm thoại 2 chiều, báo động phát hiện người, quay quét 360 độ',
  },
  {
    barcode: '8938001001028',
    name: 'Camera Ngoài Trời Imou Cruiser 2 3MP Full Color Ban Đêm',
    category: 'Camera CCTV',
    costPrice: 650000,
    sellingPrice: 890000,
    stock: 18,
    minStock: 4,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=60',
    description: 'Camera ngoài trời chống nước IP66 có màu ban đêm, còi hú chớp đèn răn đe',
  },
  {
    barcode: '8938001001035',
    name: 'Đầu Ghi Hình 4 Kênh Hikvision DS-7104HQHI Chuẩn H.265+',
    category: 'Camera CCTV',
    costPrice: 850000,
    sellingPrice: 1250000,
    stock: 10,
    minStock: 2,
    unit: 'Bộ',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=60',
    description: 'Đầu ghi hình hỗ trợ camera 2MP-4MP xuất hình HDMI/VGA xem qua điện thoại mượt mà',
  },
  {
    barcode: '8938001001042',
    name: 'Ổ Cứng Camera WD Purple 1TB Chuyên Dụng 24/7',
    category: 'Camera CCTV',
    costPrice: 890000,
    sellingPrice: 1150000,
    stock: 15,
    minStock: 3,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=60',
    description: 'Ổ cứng chuyên dụng Western Digital chạy êm, độ bền ghi hình camera liên tục 24/7',
  },
  {
    barcode: '8938001001059',
    name: 'Nguồn Đũa Camera 12V-2A Chống Nhiễu Có IC Ổn Áp',
    category: 'Camera CCTV',
    costPrice: 25000,
    sellingPrice: 55000,
    stock: 65,
    minStock: 15,
    unit: 'Cái',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=60',
    description: 'Adapter nguồn 12V 2A cấp nguồn camera chống sét và chống tụt áp',
  },
  {
    barcode: '8938001002018',
    name: 'Máy In Laser Trắng Đen Canon LBP 2900 Chính Hãng',
    category: 'Máy In & Mực In',
    costPrice: 3850000,
    sellingPrice: 4350000,
    stock: 8,
    minStock: 2,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&auto=format&fit=crop&q=60',
    description: 'Máy in quốc dân siêu bền, tốc độ 12 trang/phút, hộp mực lớn dễ thay',
  },
  {
    barcode: '8938001002025',
    name: 'Hộp Mực Máy In Canon 2900 / HP 1020 (Cartridge 12A/303)',
    category: 'Máy In & Mực In',
    costPrice: 85000,
    sellingPrice: 160000,
    stock: 45,
    minStock: 10,
    unit: 'Hộp',
    imageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=300&auto=format&fit=crop&q=60',
    description: 'Hộp mực mới 100% in đậm nét tới 2000 trang, phôi dày đổ mực nhiều lần',
  },
  {
    barcode: '8938001002032',
    name: 'Chai Mực Nạp Máy In Laser HP / Canon 140g Siêu Mịn',
    category: 'Máy In & Mực In',
    costPrice: 22000,
    sellingPrice: 50000,
    stock: 60,
    minStock: 15,
    unit: 'Chai',
    imageUrl: 'https://images.unsplash.com/photo-1585336261026-c2cf93b9fa44?w=300&auto=format&fit=crop&q=60',
    description: 'Mực đổ siêu mịn, ít mực thải, chữ in sắc nét cho các dòng máy in laser',
  },
  {
    barcode: '8938001002049',
    name: 'Giấy In Double A Khổ A4 Định Lượng 70gsm (Ram 500 tờ)',
    category: 'Máy In & Mực In',
    costPrice: 72000,
    sellingPrice: 92000,
    stock: 50,
    minStock: 10,
    unit: 'Ram',
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=60',
    description: 'Giấy in văn phòng cao cấp Thái Lan, mặt giấy trắng mịn chống kẹt giấy',
  },
  {
    barcode: '8938001003015',
    name: 'Ổ Cứng SSD Kingston NV2 500GB PCIe 4.0 NVMe M.2',
    category: 'Máy Tính & Laptop',
    costPrice: 890000,
    sellingPrice: 1190000,
    stock: 20,
    minStock: 5,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300&auto=format&fit=crop&q=60',
    description: 'Tốc độ đọc lên tới 3500MB/s chuẩn Gen4x4 nâng cấp PC và Laptop chạy cực nhanh',
  },
  {
    barcode: '8938001003022',
    name: 'RAM DDR4 Kingston Fury Beast 8GB Bus 3200MHz',
    category: 'Máy Tính & Laptop',
    costPrice: 430000,
    sellingPrice: 590000,
    stock: 25,
    minStock: 5,
    unit: 'Thanh',
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=300&auto=format&fit=crop&q=60',
    description: 'Bộ nhớ RAM tản nhiệt nhôm đen cao cấp, tự động tối ưu tương thích mainboard',
  },
  {
    barcode: '8938001003039',
    name: 'Bộ Bàn Phím Chuột Không Dây Văn Phòng Logitech MK220',
    category: 'Linh Kiện & Phụ Kiện',
    costPrice: 280000,
    sellingPrice: 380000,
    stock: 30,
    minStock: 6,
    unit: 'Bộ',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=60',
    description: 'Bộ phím chuột sóng wireless 2.4GHz pin 24 tháng, phím bấm êm ái tiện dụng',
  },
  {
    barcode: '8938001004012',
    name: 'Switch Chia Mạng 8 Cổng TP-Link TL-SG1008D Gigabit 1000M',
    category: 'Thiết Bị Mạng',
    costPrice: 320000,
    sellingPrice: 460000,
    stock: 16,
    minStock: 4,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&auto=format&fit=crop&q=60',
    description: 'Bộ chia mạng 8 cổng tốc độ cao chia mạng LAN cho hệ thống Camera và máy tính',
  },
  {
    barcode: '8938001004029',
    name: 'Cuộn Dây Cáp Mạng Cat6 UTP 305m Chuyên Camera & Net',
    category: 'Thiết Bị Mạng',
    costPrice: 750000,
    sellingPrice: 1050000,
    stock: 7,
    minStock: 2,
    unit: 'Cuộn',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=60',
    description: 'Cáp mạng đồng chuẩn Cat6 vỏ dẻo dai truyền tín hiệu xa và ổn định cao',
  },
  {
    barcode: '8938001003046',
    name: 'Màn Hình Máy Tính Samsung 24 Inch IPS 75Hz Full HD',
    category: 'Máy Tính & Laptop',
    costPrice: 1750000,
    sellingPrice: 2250000,
    stock: 12,
    minStock: 3,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&auto=format&fit=crop&q=60',
    description: 'Màn hình văn phòng viền mỏng IPS góc nhìn rộng, cổng kết nối HDMI/VGA',
  },
  {
    barcode: '8938001001066',
    name: 'Thẻ Nhớ SanDisk Ultra 64GB MicroSD Chuyên Camera IP',
    category: 'Camera CCTV',
    costPrice: 85000,
    sellingPrice: 140000,
    stock: 50,
    minStock: 10,
    unit: 'Chiếc',
    imageUrl: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=300&auto=format&fit=crop&q=60',
    description: 'Thẻ nhớ chuyên dụng camera giám sát đọc ghi liên tục lưu trữ video 6-8 ngày',
  },
  {
    barcode: '8938001004036',
    name: 'Hộp Hạt Mạng RJ45 Cat5e/Cat6 Chân Đồng Mạ Vàng (100 Hạt)',
    category: 'Thiết Bị Mạng',
    costPrice: 45000,
    sellingPrice: 95000,
    stock: 35,
    minStock: 5,
    unit: 'Hộp',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&auto=format&fit=crop&q=60',
    description: 'Đầu bấm hạt mạng RJ45 chuẩn tiếp xúc đồng mạ vàng chống rỉ sét',
  },
  {
    barcode: '8938001005019',
    name: 'Dịch Vụ Lắp Đặt Camera / Đổ Mực Máy In Tận Nơi',
    category: 'Dịch Vụ & Lắp Đặt',
    costPrice: 50000,
    sellingPrice: 150000,
    stock: 999,
    minStock: 10,
    unit: 'Lần',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60',
    description: 'Công thợ kỹ thuật lắp đặt camera, bảo trì hệ thống hoặc nạp mực máy in tận nơi',
  },
];

export async function reloadCctvSampleProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));

    const now = new Date().toISOString();
    const created: Product[] = [];
    for (const item of INITIAL_PRODUCTS) {
      const docRef = doc(collection(db, COLLECTION_NAME));
      const newProd: Product = {
        ...item,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(docRef, newProd);
      created.push(newProd);
    }
    await batch.commit();
    return created;
  } catch (err) {
    console.error('Error resetting CCTV sample products:', err);
    return INITIAL_PRODUCTS.map((item, index) => ({
      ...item,
      id: `cctv-${index + 1}`,
      createdAt: new Date().toISOString(),
    }));
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const list: Product[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });

    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    console.warn('Could not fetch products from Firestore:', error);
    return [];
  }
}

export async function clearAllProducts(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    throw error;
  }
}

export async function seedInitialProducts(): Promise<Product[]> {
  const now = new Date().toISOString();
  const created: Product[] = INITIAL_PRODUCTS.map((item, index) => ({
    ...item,
    id: `prod-${index + 1}`,
    createdAt: now,
  }));

  try {
    const batch = writeBatch(db);
    for (const item of INITIAL_PRODUCTS) {
      const docRef = doc(collection(db, COLLECTION_NAME));
      batch.set(docRef, {
        ...item,
        id: docRef.id,
        createdAt: now,
      });
    }
    await batch.commit();
    return created;
  } catch (error) {
    console.warn('Could not commit initial product seed to Firestore:', error);
    return created;
  }
}

export async function createProduct(productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  try {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newProduct: Product = {
      ...productData,
      id: docRef.id,
      barcode: productData.barcode || generateBarcode(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newProduct);
    return newProduct;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function importProductsBatch(
  productsToImport: Array<Omit<Product, 'id' | 'createdAt' | 'barcode'> & { barcode?: string }>,
  existingProducts: Product[]
): Promise<{ added: number; updated: number }> {
  try {
    const batch = writeBatch(db);
    let addedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    const barcodeMap = new Map<string, Product>();
    existingProducts.forEach((p) => {
      if (p.barcode) {
        barcodeMap.set(p.barcode.toLowerCase(), p);
      }
    });

    for (const item of productsToImport) {
      const barcodeKey = item.barcode ? item.barcode.toLowerCase() : '';
      const existing = barcodeKey ? barcodeMap.get(barcodeKey) : undefined;

      if (existing) {
        // Update existing product
        const docRef = doc(db, COLLECTION_NAME, existing.id);
        batch.set(
          docRef,
          {
            name: item.name || existing.name,
            category: item.category || existing.category,
            costPrice: item.costPrice !== undefined ? item.costPrice : existing.costPrice,
            sellingPrice: item.sellingPrice !== undefined ? item.sellingPrice : existing.sellingPrice,
            stock: item.stock !== undefined ? item.stock : existing.stock,
            minStock: item.minStock !== undefined ? item.minStock : existing.minStock,
            unit: item.unit || existing.unit,
            description: item.description !== undefined ? item.description : existing.description,
            updatedAt: now,
          },
          { merge: true }
        );
        updatedCount++;
      } else {
        // Add new product
        const docRef = doc(collection(db, COLLECTION_NAME));
        const newProduct: Product = {
          ...item,
          id: docRef.id,
          barcode: item.barcode || generateBarcode(),
          createdAt: now,
          updatedAt: now,
        };
        batch.set(docRef, newProduct);
        addedCount++;
      }
    }

    await batch.commit();
    return { added: addedCount, updated: updatedCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    throw error;
  }
}
