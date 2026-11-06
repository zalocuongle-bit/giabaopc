import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StoreSettings } from '../types';

const SETTINGS_DOC_ID = 'store_config';
const CREDENTIALS_DOC_ID = 'admin_credentials';
const COLLECTION_NAME = 'settings';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'GIA BẢO PC - CCTV, MÁY TÍNH & MÁY IN',
  storePhone: '0988.123.456 - 024.3869.8899',
  storeAddress: '128 Lê Thanh Nghị, Hai Bà Trưng, Hà Nội',
  receiptFooter: 'Cảm ơn quý khách đã tin dùng sản phẩm và dịch vụ của Gia Bảo PC!\nBảo hành chính hãng linh kiện, camera & máy in theo tem dán.\nHotline kỹ thuật & Lắp đặt CCTV: 0988.123.456',
  printerFormat: 'K80', // K80 (80mm) is standard POS receipt
  autoPrintReceipt: true, // Auto-triggers print dialog after payment as requested
  bankName: 'MBBANK',
  bankAccount: '0988123456',
  bankAccountName: 'GIA BAO PC',
};

export const DEFAULT_ADMIN_USERNAME = 'giabaopc';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() } as StoreSettings;
    } else {
      try {
        await setDoc(docRef, DEFAULT_SETTINGS);
      } catch (writeErr) {
        console.warn('Could not persist default store settings to Firestore:', writeErr);
      }
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.warn('Error reading store settings from Firestore, using default:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${SETTINGS_DOC_ID}`);
    throw error;
  }
}

export async function getAdminPassword(): Promise<string> {
  const local = localStorage.getItem('pos_admin_password');
  try {
    const docRef = doc(db, COLLECTION_NAME, CREDENTIALS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.password) {
      const pass = String(snap.data().password);
      localStorage.setItem('pos_admin_password', pass);
      return pass;
    }
  } catch (err) {
    console.warn('Could not read admin credentials from Firestore:', err);
  }
  return local || DEFAULT_ADMIN_PASSWORD;
}

export async function saveAdminPassword(newPassword: string): Promise<void> {
  localStorage.setItem('pos_admin_password', newPassword);
  try {
    const docRef = doc(db, COLLECTION_NAME, CREDENTIALS_DOC_ID);
    await setDoc(
      docRef,
      {
        username: DEFAULT_ADMIN_USERNAME,
        password: newPassword,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync password to Firestore:', err);
  }
}
