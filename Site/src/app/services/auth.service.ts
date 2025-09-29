import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorageService, StoredAuthUser } from './token-storage.service';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredAuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly accessToken$ = new BehaviorSubject<string | null>(this.storage.getAccessToken());
  private readonly refreshToken$ = new BehaviorSubject<string | null>(this.storage.getRefreshToken());
  private readonly authUser$ = new BehaviorSubject<StoredAuthUser | null>(this.storage.getUser());

  private refreshInFlight$: Observable<string> | null = null;

  readonly user$ = this.authUser$.asObservable();

  readonly isAuthenticated$ = this.accessToken$.pipe(map((token) => this.isTokenValid(token)));

  login(name: string, password: string): Observable<StoredAuthUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, {
        name,
        password,
      })
      .pipe(
        tap((response) => this.setSession(response)),
        map((response) => response.user),
      );
  }

  logout(options: { redirectToLogin?: boolean } = { redirectToLogin: true }): Observable<void> {
    const refreshToken = this.refreshToken$.value;
    this.clearSession();

    if (!refreshToken) {
      if (options.redirectToLogin !== false) {
        void this.router.navigate(['/admin/login']);
      }
      return of(void 0);
    }

    return this.http
      .post(`${this.baseUrl}/logout`, { refreshToken })
      .pipe(
        catchError(() => of(null)),
        tap(() => {
          if (options.redirectToLogin !== false) {
            void this.router.navigate(['/admin/login']);
          }
        }),
        map(() => void 0),
      );
  }

  refreshTokens(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.refreshToken$.value;

    if (!refreshToken) {
      this.handleAuthFailure();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight$ = this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(
        tap((response) => this.setSession(response)),
        map((response) => response.accessToken),
        catchError((error) => {
          this.handleAuthFailure();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  ensureValidAccessToken(): Observable<boolean> {
    const token = this.accessToken$.value;
    if (this.isTokenValid(token)) {
      return of(true);
    }

    const refreshToken = this.refreshToken$.value;
    if (!refreshToken) {
      this.handleAuthFailure(false);
      return of(false);
    }

    return this.refreshTokens().pipe(
      map(() => true),
      catchError(() => {
        this.handleAuthFailure(false);
        return of(false);
      }),
    );
  }

  getAccessToken(): string | null {
    const token = this.accessToken$.value;
    if (!this.isTokenValid(token)) {
      return null;
    }
    return token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken$.value;
  }

  getUser(): StoredAuthUser | null {
    return this.authUser$.value;
  }

  isAdmin(): boolean {
    const role = this.authUser$.value?.role;
    return role ? role.toLowerCase() === 'admin' : false;
  }

  handleAuthFailure(redirectToLogin: boolean = true): void {
    this.clearSession();
    if (redirectToLogin) {
      void this.router.navigate(['/admin/login']);
    }
  }

  private setSession(response: AuthResponse): void {
    this.storage.setAccessToken(response.accessToken);
    this.storage.setRefreshToken(response.refreshToken);
    this.storage.setUser(response.user);
    this.accessToken$.next(response.accessToken);
    this.refreshToken$.next(response.refreshToken);
    this.authUser$.next(response.user);
  }

  private clearSession(): void {
    this.storage.clearAll();
    this.accessToken$.next(null);
    this.refreshToken$.next(null);
    this.authUser$.next(null);
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) {
      return false;
    }

    const payload = this.decodeToken(token);
    if (!payload?.exp) {
      return false;
    }

    const expiry = payload.exp * 1000;
    return Date.now() < expiry;
  }

  private decodeToken(token: string): { exp?: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
