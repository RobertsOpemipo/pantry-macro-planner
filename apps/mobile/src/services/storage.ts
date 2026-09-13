import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_user_token';
let memoryFallback: string | null = null;

export async function saveAuthToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      memoryFallback = token;
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    memoryFallback = token;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return memoryFallback;
    }
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    return stored || memoryFallback;
  } catch (error) {
    return memoryFallback;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    memoryFallback = null;
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    memoryFallback = null;
  }
}