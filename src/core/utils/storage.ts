import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearByPrefix(prefix: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const matches = keys.filter((key) => key.startsWith(prefix));
  if (matches.length > 0) {
    await AsyncStorage.multiRemove(matches);
  }
}