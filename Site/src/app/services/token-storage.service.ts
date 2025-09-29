import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'flightdeck_access_token';
const REFRESH_TOKEN_KEY = 'flightdeck_refresh_token';
const USER_KEY = 'flightdeck_auth_user';

export interface StoredAuthUser {
  id: string;
  name: string;
  role: string | null;
}

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return this.read(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string | null): void {
    this.write(ACCESS_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return this.read(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string | null): void {
    this.write(REFRESH_TOKEN_KEY, token);
  }

  getUser(): StoredAuthUser | null {
    const raw = this.read(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredAuthUser;
    } catch {
      this.remove(USER_KEY);
      return null;
    }
  }

  setUser(user: StoredAuthUser | null): void {
    if (!user) {
      this.remove(USER_KEY);
      return;
    }
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage failures
    }
  }

  clearAll(): void {
    this.remove(ACCESS_TOKEN_KEY);
    this.remove(REFRESH_TOKEN_KEY);
    this.remove(USER_KEY);
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value === null || value === undefined || value === '') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore storage failures
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  }
}
