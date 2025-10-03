import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorageService, StoredAuthUser } from './token-storage.service';
import { AUTH_CONTEXT, AuthContext, SKIP_AUTH_REFRESH } from '../interceptors/auth.interceptor';

interface AuthSessionResponse {
  user: StoredAuthUser;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

interface LegacyUserResponse {
  user: LegacyUser;
}

export interface LegacyUser {
  id: string;
  name: string;
}

const REDIRECT_PATH_ALIASES: Record<string, string> = {
  '/dashboard': '/dashboard',
  '/dashboard/': '/dashboard',
  '/dashbaord': '/dashboard',
  '/dashbaord/': '/dashboard',
  '/admin': '/admin',
  '/admin/': '/admin',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly userSubject = new BehaviorSubject<StoredAuthUser | null>(this.storage.getUser());
  readonly user$ = this.userSubject.asObservable();

  private readonly legacyUserSubject = new BehaviorSubject<LegacyUser | null>(null);
  readonly legacyUser$ = this.legacyUserSubject.asObservable();

  private legacyUserChecked = false;
  private legacyUserHeader: string | null = null;

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

  checkLegacyUser(options: { force?: boolean; legacyUserId?: string | null } = {}): Observable<LegacyUser | null> {
    const { force = false } = options;
    const incomingId = this.normalizeLegacyUserId(options.legacyUserId);

    if (incomingId !== undefined) {
      this.setLegacyUserId(incomingId);
    }

    if (this.currentUser) {
      this.clearLegacyUserContext();
      return of(null);
    }

    const headerValue = this.legacyUserHeader;

    if (!headerValue) {
      if (!this.legacyUserChecked || force) {
        this.clearLegacyUserState();
        this.legacyUserChecked = true;
      }
      return of(null);
    }

    if (!force && this.legacyUserChecked) {
      return of(this.legacyUserSubject.value);
    }

    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);
    const headers = new HttpHeaders().set('x-user-id', headerValue);

    return this.http
      .get<LegacyUserResponse>(`${this.baseUrl}/legacy-user`, {
        context,
        observe: 'response',
        headers,
      })
      .pipe(
        map((response: HttpResponse<LegacyUserResponse>) => {
          const user = response.body?.user ?? null;

          if (user) {
            this.legacyUserSubject.next(user);
            this.legacyUserChecked = true;
            return user;
          }

          this.clearLegacyUserContext();
          return null;
        }),
        catchError(() => {
          this.clearLegacyUserState();
          this.legacyUserChecked = false;
          return of(null);
        }),
      );
  }

  getLegacyUser(options: { force?: boolean } = {}): Observable<LegacyUser | null> {
    return this.checkLegacyUser(options);
  }

  getLegacyUserSnapshot(): LegacyUser | null {
    return this.legacyUserSubject.value;
  }

  getLegacyUserHeader(): string | null {
    return this.legacyUserHeader;
  }

  resetLegacyPassword(password: string, confirmPassword: string): Observable<StoredAuthUser> {
    const headerValue = this.legacyUserHeader;

    if (!headerValue) {
      return throwError(() => new Error('Missing legacy user context.'));
    }

    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);
    const headers = new HttpHeaders().set('x-user-id', headerValue);

    return this.http
      .post<AuthSessionResponse>(
        `${this.baseUrl}/legacy-password-reset`,
        { password, confirmPassword },
        { context, headers },
      )
      .pipe(
        tap((response) => {
          this.setSession(response.user);
        }),
        map((response) => response.user),
      );
  }

  setLegacyUserId(value: string | null): void {
    const normalized = this.normalizeLegacyUserId(value) ?? null;

    if (normalized === this.legacyUserHeader) {
      return;
    }

    this.legacyUserHeader = normalized;
    this.legacyUserChecked = false;

    if (!normalized) {
      this.clearLegacyUserState();
      this.legacyUserChecked = false;
    }
  }

  logout(options: { redirectTo?: string | false } = {}): Observable<void> {
    const context = new HttpContext().set(SKIP_AUTH_REFRESH, true);
    this.clearSession();

    return this.http
      .post<{ success: true }>(`${this.baseUrl}/logout`, {}, { context })
      .pipe(
        catchError(() => of({ success: false as const })),
        tap(() => {
          const redirectTo = options.redirectTo ?? '/admin/login';
          if (redirectTo !== false) {
            void this.router.navigate([redirectTo]);
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

  ensureSession(context: AuthContext = 'dashboard'): Observable<boolean> {
    if (this.currentUser) {
      return of(true);
    }

    const httpContext = new HttpContext().set(SKIP_AUTH_REFRESH, true).set(AUTH_CONTEXT, context);

    return this.http
      .get<AuthSessionResponse>(`${this.baseUrl}/session`, { context: httpContext })
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

  handleAuthFailure(redirect: boolean | string = true): void {
    this.clearSession();
    if (redirect === false) {
      return;
    }
    const target = typeof redirect === 'string' ? redirect : '/admin/login';
    void this.router.navigate([target]);
  }

  resolveRedirectPath(
    target: string | null | undefined,
    fallback: string,
    allowed?: readonly string[],
  ): string {
    const normalized = this.normalizeRedirectTarget(target);
    if (!normalized) {
      return fallback;
    }

    const canonical = REDIRECT_PATH_ALIASES[normalized] ?? normalized;
    const allowedTargets = allowed && allowed.length > 0 ? [...allowed] : [fallback];

    return allowedTargets.includes(canonical) ? canonical : fallback;
  }

  private normalizeRedirectTarget(target: string | null | undefined): string | null {
    if (typeof target !== 'string') {
      return null;
    }

    let candidate = target.trim();
    if (!candidate) {
      return null;
    }

    const absoluteUrlPattern = /^[a-z][a-z0-9+.-]*:\/\//i;
    if (absoluteUrlPattern.test(candidate)) {
      try {
        candidate = new URL(candidate).pathname;
      } catch {
        return null;
      }
    }

    if (!candidate.startsWith('/')) {
      candidate = `/${candidate}`;
    }

    const pathOnly = candidate.split(/[?#]/)[0] ?? candidate;
    const collapsed = pathOnly.replace(/\/{2,}/g, '/');
    const withoutTrailingSlash =
      collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;

    if (!withoutTrailingSlash) {
      return null;
    }

    return withoutTrailingSlash.toLowerCase();
  }

  private setSession(user: StoredAuthUser): void {
    this.userSubject.next(user);
    this.storage.setUser(user);
    this.clearLegacyUserContext();
  }

  private clearSession(): void {
    this.userSubject.next(null);
    this.storage.clearAll();
    this.clearLegacyUserContext();
  }

  private clearLegacyUserContext(): void {
    this.clearLegacyUserState();
    this.legacyUserHeader = null;
    this.legacyUserChecked = true;
  }

  private clearLegacyUserState(): void {
    this.legacyUserSubject.next(null);
  }

  private normalizeLegacyUserId(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
