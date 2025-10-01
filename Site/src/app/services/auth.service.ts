import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpContext,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorageService, StoredAuthUser } from './token-storage.service';
import { SKIP_AUTH_REFRESH } from '../interceptors/auth.interceptor';

interface AuthSessionResponse {
  user: StoredAuthUser;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly userSubject = new BehaviorSubject<StoredAuthUser | null>(this.storage.getUser());
  readonly user$ = this.userSubject.asObservable();

  private refreshInFlight$: Observable<boolean> | null = null;

  get currentUser(): StoredAuthUser | null {
    return this.userSubject.value;
  }

  login(name: string, password: string): Observable<StoredAuthUser> {
    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);
    return this.http
      .post<AuthSessionResponse>(`${this.baseUrl}/login`, { name, password }, { context })
      .pipe(
        tap((response) => this.setSession(response.user)),
        map((response) => response.user),
      );
  }

  logout(options: { redirectToLogin?: boolean } = { redirectToLogin: true }): Observable<void> {
    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);
    this.clearSession();

    return this.http
      .post<{ success: true }>(`${this.baseUrl}/logout`, {}, { context })
      .pipe(
        catchError(() => of({ success: false as const })),
        tap(() => {
          if (options.redirectToLogin !== false) {
            void this.router.navigate(['/admin/login']);
          }
        }),
        map(() => void 0),
      );
  }

  refreshSession(): Observable<boolean> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);

    this.refreshInFlight$ = this.http
      .post<AuthSessionResponse>(`${this.baseUrl}/refresh`, {}, { context })
      .pipe(
        tap((response) => this.setSession(response.user)),
        map(() => true),
        catchError((error) => {
          this.handleAuthFailure(false);
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  ensureSession(): Observable<boolean> {
    if (this.currentUser) {
      return of(true);
    }

    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);

    return this.http
      .get<AuthSessionResponse>(`${this.baseUrl}/session`, { context })
      .pipe(
        tap((response) => this.setSession(response.user)),
        map(() => true),
        catchError(() => {
          this.handleAuthFailure(false);
          return of(false);
        }),
      );
  }

  isAdmin(): boolean {
    const role = this.currentUser?.role;
    return role ? role.toLowerCase() === 'admin' : false;
  }

  handleAuthFailure(redirectToLogin: boolean = true): void {
    this.clearSession();
    if (redirectToLogin) {
      void this.router.navigate(['/admin/login']);
    }
  }

  private setSession(user: StoredAuthUser): void {
    this.userSubject.next(user);
    this.storage.setUser(user);
  }

  private clearSession(): void {
    this.userSubject.next(null);
    this.storage.clearAll();
  }
}
