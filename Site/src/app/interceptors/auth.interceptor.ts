import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

function isApiUrl(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl);
}

function shouldAttachToken(url: string): boolean {
  if (!isApiUrl(url)) {
    return false;
  }
  return !url.includes('/auth/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  let modifiedRequest = req;

  if (shouldAttachToken(req.url)) {
    const token = authService.getAccessToken();
    if (token) {
      modifiedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(modifiedRequest).pipe(
    catchError((error) => {
      if (
        shouldAttachToken(req.url) &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        return authService.refreshTokens().pipe(
          switchMap((newToken) => {
            if (!newToken) {
              authService.handleAuthFailure();
              return throwError(() => error);
            }
            const retried = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.handleAuthFailure();
            return throwError(() => refreshError);
          }),
        );
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        const rawMessage =
          typeof error.error === 'string'
            ? error.error
            : typeof error.error === 'object' && error.error
              ? String(error.error.error ?? '')
              : '';
        if (rawMessage.toLowerCase().includes('invalid signature')) {
          authService.handleAuthFailure();
        }
      }

      return throwError(() => error);
    }),
  );
};
