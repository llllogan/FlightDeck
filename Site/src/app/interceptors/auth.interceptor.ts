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

  return next(requestWithCredentials).pipe(
    catchError((error) => {
      const isHttpError = error instanceof HttpErrorResponse;

      if (!isHttpError) {
        return throwError(() => error);
      }

      const isLoginRequest = requestWithCredentials.url.includes('/auth/login');
      const isRefreshRequest = requestWithCredentials.url.includes('/auth/refresh');
      const shouldAttemptRefresh =
        !skipRefresh &&
        !isLoginRequest &&
        !isRefreshRequest &&
        error.status === 401 &&
        isApiUrl(requestWithCredentials.url);

      if (shouldAttemptRefresh) {
        return authService.refreshSession().pipe(
          switchMap(() => {
            const retryContext = requestWithCredentials.context.set(SKIP_AUTH_REFRESH, true);
            const retried = requestWithCredentials.clone({ context: retryContext });
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.handleAuthFailure();
            return throwError(() => refreshError);
          }),
        );
      }

      if (error.status === 401 || error.status === 403) {
        authService.handleAuthFailure();
      }

      return throwError(() => error);
    }),
  );
};
