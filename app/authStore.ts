import * as SecureStore from 'expo-secure-store';

type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  isCompleted: boolean;
};

let currentUser: User | null = null;
let currentToken: string | null = null;
let listeners: (() => void)[] = [];

export const authStore = {
  getUser: () => currentUser,
  getToken: () => currentToken,
  isLoggedIn: () => currentToken !== null,

  login: async (user: User, token: string, refreshToken: string) => {
    currentUser = user;
    currentToken = token;
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    listeners.forEach(l => l());
  },

  logout: async () => {
    currentUser = null;
    currentToken = null;
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
    listeners.forEach(l => l());
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');
      if (token && userData) {
        currentToken = token;
        currentUser = JSON.parse(userData);
        listeners.forEach(l => l());
      }
    } catch (e) {
      console.log('Failed to load auth from storage');
    }
  },

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
};