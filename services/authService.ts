import { UserProfile } from '../types';
import { authApi, isAuthenticated, clearTokens } from './api';
import localforage from 'localforage';

const USER_KEY = 'current_user';

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  // If we have API tokens, try to get user from backend
  if (isAuthenticated()) {
    try {
      const data = await authApi.me();
      const user: UserProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        isGuest: false,
        avatar: data.avatar,
      };
      await localforage.setItem(USER_KEY, user);
      return user;
    } catch (e) {
      // Token expired or invalid — clear stale auth state so user can re-login
      console.warn('Auth token expired, clearing session');
      clearTokens();
      await localforage.removeItem(USER_KEY);
      return null;
    }
  }

  // Check for local guest/cached user (no API call needed)
  const cached = await localforage.getItem<UserProfile>(USER_KEY);
  return cached || null;
};

export const loginAsGuest = async (): Promise<UserProfile> => {
  const guest: UserProfile = {
    id: 'guest',
    email: 'guest@slayjobs.ai',
    name: 'Guest User',
    isGuest: true,
    cvText: ''
  };
  await localforage.setItem(USER_KEY, guest);
  return guest;
};

export const logoutUser = async () => {
  if (isAuthenticated()) {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore logout errors
    }
  }
  clearTokens();
  await localforage.removeItem(USER_KEY);
};
