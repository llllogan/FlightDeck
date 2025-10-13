import { Injectable } from '@angular/core';

const USER_KEY = 'flightdeck_auth_user';

export interface StoredAuthUser {
  id: string;
  name: string;
  role: string | null;
}

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
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
    this.remove(USER_KEY);
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
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
