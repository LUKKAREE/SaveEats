/**
 * เก็บข้อมูลลงเครื่อง (Token, ข้อมูลผู้ใช้, ข้อมูลร้าน)
 * ใช้ AsyncStorage ซึ่งข้อมูลจะยังอยู่แม้ปิดแอปแล้วเปิดใหม่
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PublicUser, Store } from '@shared/index';
import { STORAGE_KEYS } from '../constants/appConstants';

/** แปลงข้อความ JSON กลับเป็น object แบบปลอดภัย (ถ้าพังคืน null) */
function parseJson<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const storageService = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  async setUser(user: PublicUser): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  async getUser(): Promise<PublicUser | null> {
    return parseJson<PublicUser>(await AsyncStorage.getItem(STORAGE_KEYS.USER));
  },

  async setStore(store: Store | null): Promise<void> {
    if (store === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.STORE);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(store));
  },
  async getStore(): Promise<Store | null> {
    return parseJson<Store>(await AsyncStorage.getItem(STORAGE_KEYS.STORE));
  },

  /** ล้างทุกอย่างตอน logout */
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.STORE,
    ]);
  },
};

export default storageService;
