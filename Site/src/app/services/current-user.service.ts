import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

const STORAGE_KEY = 'flightdeck_user_id';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly initialQueryUserId = this.extractUserIdFromQuery();
  private readonly initialStoredUserId = this.getStoredUserId();
  private readonly userIdSubject = new BehaviorSubject<string | null>(
    this.initialQueryUserId ?? this.initialStoredUserId,
  );

  readonly userId$ = this.userIdSubject.asObservable();

  constructor() {
    if (this.initialQueryUserId) {
      this.persistUserId(this.initialQueryUserId);
    }
  }

  initialize(): Observable<string> {
    if (this.initialQueryUserId) {
      return of(this.initialQueryUserId);
    }

    const existing = this.userIdSubject.value;
    if (existing) {
      return of(existing);
    }

    return throwError(() => new Error('User id is required. Provide ?userid=... or call setUserId().'));
  }

  setUserId(userId: string | null): void {
    if (!userId) {
      localStorage.removeItem(STORAGE_KEY);
      this.userIdSubject.next(null);
      return;
    }
    this.persistUserId(userId);
  }

  private persistUserId(userId: string): void {
    localStorage.setItem(STORAGE_KEY, userId);
    this.userIdSubject.next(userId);
  }

  private getStoredUserId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private extractUserIdFromQuery(): string | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get('userid');
      return value && value.trim() ? value.trim() : null;
    } catch {
      return null;
    }
  }

}
