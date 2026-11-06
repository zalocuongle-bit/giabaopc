import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, Product } from '../types';
import { generateOrderNumber } from '../utils/formatters';

const COLLECTION_NAME = 'orders';
const PRODUCTS_COLLECTION = 'products';

export async function getOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });

    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    console.warn('Could not load orders from Firestore:', error);
    return [];
  }
}

export async function clearAllOrders(): Promise<void> {
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

export async function createOrder(
  orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>,
  customOrderNumber?: string
): Promise<Order> {
  try {
    const batch = writeBatch(db);
    const orderDocRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const orderNumber = customOrderNumber || generateOrderNumber();

    const newOrder: Order = {
      ...orderPayload,
      id: orderDocRef.id,
      orderNumber,
      createdAt: now,
    };

    batch.set(orderDocRef, newOrder);

    // Deduct stock for each purchased item
    for (const item of orderPayload.items) {
      if (item.productId) {
        const prodRef = doc(db, PRODUCTS_COLLECTION, item.productId);
        batch.update(prodRef, {
          stock: increment(-item.quantity),
          updatedAt: now,
        });
      }
    }

    await batch.commit();
    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    throw error;
  }
}

// Seed initial orders so user can immediately view analytics and print existing receipts
export async function seedInitialOrders(products: Product[]): Promise<Order[]> {
  if (!products || products.length === 0) return [];

  const orders: Order[] = [];
  try {
    const batch = writeBatch(db);
    const now = new Date();

    const sampleCustomers = [
      { name: 'Nguyễn Văn An', phone: '0912345678' },
      { name: 'Trần Thị Mai', phone: '0988765432' },
      { name: 'Lê Hoàng Nam', phone: '0903112233' },
      { name: 'Phạm Thu Trang', phone: '0977445566' },
      { name: 'Khách vãng lai', phone: '' },
    ];

    // Create 8 realistic orders spanning today, yesterday, and 3-5 days ago
    const dayOffsets = [0, 0, 1, 1, 2, 3, 5, 6];

    for (let i = 0; i < dayOffsets.length; i++) {
      const daysAgo = dayOffsets[i];
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 3600 * 1000);
      const cust = sampleCustomers[i % sampleCustomers.length];

      // Pick 2-3 random products
      const p1 = products[i % products.length];
      const p2 = products[(i + 2) % products.length];
      const qty1 = Math.floor(Math.random() * 2) + 1;
      const qty2 = Math.floor(Math.random() * 3) + 1;

      const items = [
        {
          productId: p1.id,
          barcode: p1.barcode,
          name: p1.name,
          category: p1.category,
          costPrice: p1.costPrice,
          unitPrice: p1.sellingPrice,
          quantity: qty1,
          subtotal: p1.sellingPrice * qty1,
        },
        {
          productId: p2.id,
          barcode: p2.barcode,
          name: p2.name,
          category: p2.category,
          costPrice: p2.costPrice,
          unitPrice: p2.sellingPrice,
          quantity: qty2,
          subtotal: p2.sellingPrice * qty2,
        },
      ];

      const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
      const costTotal = items.reduce((s, it) => s + it.costPrice * it.quantity, 0);
      const discount = i % 3 === 0 ? 10000 : 0;
      const total = subtotal - discount;
      const profit = total - costTotal;

      const paymentMethod = i % 2 === 0 ? 'cash' : 'transfer';
      const cashGiven = paymentMethod === 'cash' ? Math.ceil(total / 50000) * 50000 : total;
      const changeDue = cashGiven - total;

      const sampleNotes = [
        'Lắp đặt camera Ezviz ngoài trời tại số 45 ngõ 12',
        'Giao máy in Canon 2900 tận nơi, hỗ trợ cài driver',
        'Bảo hành SSD Kingston NVMe 36 tháng theo serial',
        'Nạp mực máy in phòng kế toán, vệ sinh gạt mực',
        'Bảo hành RAM DDR4 8GB 36T',
        'Lắp switch TP-Link & bấm đầu cáp mạng Cat6',
        'Test kỹ bản in trước khi bàn giao khách',
        'Lắp đặt trọn gói camera gia đình',
      ];

      const docRef = doc(collection(db, COLLECTION_NAME));
      const order: Order = {
        id: docRef.id,
        orderNumber: `HD26110${7 - daysAgo}-${1000 + i}`,
        items,
        subtotal,
        discount,
        total,
        costTotal,
        profit,
        customerName: cust.name,
        customerPhone: cust.phone,
        paymentMethod: paymentMethod as 'cash' | 'transfer',
        cashGiven,
        changeDue,
        notes: sampleNotes[i % sampleNotes.length],
        cashierName: 'Gia Bảo (giabaopc)',
        status: 'completed',
        createdAt: orderDate.toISOString(),
      };

      batch.set(docRef, order);
      orders.push(order);
    }

    await batch.commit();
    return orders;
  } catch (error) {
    console.warn('Could not persist seeded orders to Firestore, returning in-memory orders:', error);
    return orders;
  }
}
