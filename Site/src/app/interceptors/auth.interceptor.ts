import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

function isApiUrl(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl);
}

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const requestWithCredentials = req.clone({ withCredentials: true });
  const skipRefresh = requestWithCredentials.context.get(SKIP_AUTH_REFRESH);

  const url = requestWithCredentials.url;
  const isAdminRequest = url.includes('/api/admin/') || url.includes('/api/debug/');
  const context: 'admin' | 'dashboard' = isAdminRequest ? 'admin' : 'dashboard';

  const isLoginRequest = url.includes('/api/auth/login');
  const isRefreshRequest = url.includes('/api/auth/refresh');

  return next(requestWithCredentials).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const shouldAttemptRefresh =
        !skipRefresh &&
        !isLoginRequest &&
        !isRefreshRequest &&
        error.status === 401 &&
        isApiUrl(url);

      if (shouldAttemptRefresh) {
        return authService.refreshSession().pipe(
          switchMap(() => {
            const retryContext = requestWithCredentials.context.set(SKIP_AUTH_REFRESH, true);
            const retried = requestWithCredentials.clone({ context: retryContext });
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.handleAuthFailure(context === 'admin' ? '/admin/login' : '/dashboard/login');
            return throwError(() => refreshError);
          }),
        );
      }

      if (!isLoginRequest && (error.status === 401 || error.status === 403)) {
        authService.handleAuthFailure(context === 'admin' ? '/admin/login' : '/dashboard/login');
      }

      return throwError(() => error);
    }),
  );
};
