import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { UsersApiService } from './users-api.service';
import { CreateUserPayload } from '../models';

const STORAGE_KEY = 'flightdeck_user_id';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly initialQueryUserId = this.extractUserIdFromQuery();
  private readonly initialStoredUserId = this.getStoredUserId();
  private readonly userIdSubject = new BehaviorSubject<string | null>(
    this.initialQueryUserId ?? this.initialStoredUserId,
  );

  readonly userId$ = this.userIdSubject.asObservable();

  constructor(private readonly usersApi: UsersApiService) {
    if (this.initialQueryUserId) {
      this.persistUserId(this.initialQueryUserId);
    }
  }

  initialize(defaultName: string = 'FlightDeck User'): Observable<string> {
    if (this.initialQueryUserId) {
      return of(this.initialQueryUserId);
    }

    const existing = this.userIdSubject.value;
    if (existing) {
      return of(existing);
    }

    const payload: CreateUserPayload = { name: defaultName };
    return this.usersApi.createUser(payload).pipe(
      tap((user) => this.persistUserId(user.id)),
      map((user) => user.id),
    );
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
