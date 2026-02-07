
import { UserProfile } from '../types';
import localforage from 'localforage';

const USER_KEY = 'current_user';

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  return await localforage.getItem<UserProfile>(USER_KEY);
};

export const loginUser = async (email: string, name: string): Promise<UserProfile> => {
  const user: UserProfile = {
    id: email, // Simple ID for mock
    email,
    name,
    isGuest: false,
    cvText: ''
  };
  // Try to load existing profile to keep CV
  const existing = await localforage.getItem<UserProfile>(USER_KEY);
  if (existing && existing.email === email) {
    user.cvText = existing.cvText;
  }
  
  await localforage.setItem(USER_KEY, user);
  return user;
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
  await localforage.removeItem(USER_KEY);
};
