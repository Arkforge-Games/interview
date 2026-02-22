// API Client for SlayJobs Backend
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080/api/v1'
  : '/api/v1';

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize tokens from localStorage
export const initAuth = () => {
  accessToken = localStorage.getItem('slayjobs_access_token');
  refreshToken = localStorage.getItem('slayjobs_refresh_token');
};

// Set tokens
export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('slayjobs_access_token', access);
  localStorage.setItem('slayjobs_refresh_token', refresh);
};

// Clear tokens
export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('slayjobs_access_token');
  localStorage.removeItem('slayjobs_refresh_token');
};

// Check if authenticated
export const isAuthenticated = () => {
  if (accessToken) return true;
  const storedToken = localStorage.getItem('slayjobs_access_token');
  if (storedToken) {
    accessToken = storedToken;
    refreshToken = localStorage.getItem('slayjobs_refresh_token');
    return true;
  }
  return false;
};

// Get access token
export const getAccessToken = () => accessToken;

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token refresh if unauthorized
  if (response.status === 401) {
    if (refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        const retryData = await retryResponse.json();
        if (!retryData.success) {
          throw new Error(retryData.error?.message || 'Request failed');
        }
        return retryData.data;
      }
    }
    clearTokens();
    throw new Error('Session expired');
  }

  const data = await response.json();

  if (!data.success) {
    const error: any = new Error(data.error?.message || 'Request failed');
    error.code = data.error?.code;
    throw error;
  }

  return data.data;
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (data.success) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  clearTokens();
  return false;
}

// ==========================================
// AUTH API
// ==========================================

export const authApi = {
  getGoogleAuthUrl: async (): Promise<{ url: string }> => {
    return apiRequest('/auth/google');
  },

  verifyGoogleToken: async (idToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string; avatar?: string };
  }> => {
    return apiRequest('/auth/google/token', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  me: async (): Promise<{
    id: string;
    email: string;
    name: string;
    avatar?: string;
    subscription: any;
  }> => {
    return apiRequest('/auth/me');
  },

  logout: async (): Promise<void> => {
    await apiRequest('/auth/logout', { method: 'POST' });
    clearTokens();
  },
};

// ==========================================
// SUBSCRIPTION API
// ==========================================

export const subscriptionApi = {
  getConfig: async (): Promise<{
    publishableKey: string;
    monthlyPrice: number;
    yearlyPrice: number;
  }> => {
    return apiRequest('/subscription/config');
  },

  getStatus: async (): Promise<{
    status: string;
    tier: 'free' | 'trial' | 'paid';
    planInterval: string | null;
    paidTrialEndsAt: string | null;
    currentPeriodEnd: string | null;
    canAccessFullFeatures: boolean;
    requiresUpgrade: boolean;
    upgradeReason: string | null;
  }> => {
    return apiRequest('/subscription/status');
  },

  createCheckout: async (planInterval: 'monthly' | 'yearly'): Promise<{ url: string }> => {
    return apiRequest('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ planInterval }),
    });
  },

  createPortalSession: async (): Promise<{ url: string }> => {
    return apiRequest('/subscription/portal', {
      method: 'POST',
    });
  },
};

// Initialize on load
initAuth();
