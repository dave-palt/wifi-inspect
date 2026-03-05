import * as SecureStore from 'expo-secure-store';
import { useSettingsStore } from '../stores/settingsStore';
import type {
  AuthToken,
  NetworkCheckRequest,
  NetworkCheckResponse,
  ReportRequest,
  NearbyAlert,
} from '@shared/src/types/api';

const DEVICE_ID_KEY = 'device_id';
const AUTH_TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

class ApiService {
  private baseUrl: string = '';
  private deviceId: string | null = null;
  private authToken: string | null = null;
  private tokenExpiry: string | null = null;

  async initialize(): Promise<void> {
    const store = useSettingsStore.getState();
    this.baseUrl = store.backendUrl;

    try {
      this.deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!this.deviceId) {
        this.deviceId = this.generateDeviceId();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, this.deviceId);
      }

      this.authToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      this.tokenExpiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

      if (this.authToken && this.tokenExpiry) {
        const expiryDate = new Date(this.tokenExpiry);
        if (expiryDate < new Date()) {
          await this.clearToken();
        }
      }
    } catch (error) {
      console.error('Failed to initialize API service:', error);
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async clearToken(): Promise<void> {
    this.authToken = null;
    this.tokenExpiry = null;
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  }

  private async ensureAuthToken(): Promise<string> {
    await this.initialize();

    if (!this.deviceId) {
      throw new Error('Device ID not available');
    }

    if (this.authToken && this.tokenExpiry) {
      const expiryDate = new Date(this.tokenExpiry);
      if (expiryDate > new Date()) {
        return this.authToken;
      }
    }

    const response = await fetch(`${this.baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': this.deviceId,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Failed to obtain auth token');
    }

    const data: AuthToken = await response.json();
    this.authToken = data.token;
    this.tokenExpiry = data.expiresAt;

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, data.expiresAt);

    return data.token;
  }

  async checkNetwork(ssid: string, bssidHash: string): Promise<NetworkCheckResponse> {
    await this.ensureAuthToken();

    const response = await fetch(`${this.baseUrl}/v1/networks/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        ssid,
        bssidHash,
      } as NetworkCheckRequest),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to check network');
    }

    return response.json();
  }

  async reportNetwork(request: ReportRequest): Promise<{ success: boolean; reportId: number }> {
    await this.ensureAuthToken();

    const response = await fetch(`${this.baseUrl}/v1/networks/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to report network');
    }

    return response.json();
  }

  async getNearbyAlerts(geohash?: string): Promise<NearbyAlert[]> {
    await this.ensureAuthToken();

    const params = new URLSearchParams();
    if (geohash) {
      params.set('geohash', geohash);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/alerts/nearby?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to get alerts');
    }

    const data = await response.json();
    return data.alerts || [];
  }

  async getHealth(): Promise<{ status: string; services: Record<string, string> }> {
    const response = await fetch(`${this.baseUrl}/v1/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get health status');
    }

    return response.json();
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }
}

export const apiService = new ApiService();
