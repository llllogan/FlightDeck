import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of, switchMap } from 'rxjs';

const LEGACY_QUERY_KEYS = ['userId', 'userid', 'user', 'legacyUserId'];

function extractLegacyUserId(route: ActivatedRouteSnapshot): string | null {
  if (!route) {
    return null;
  }

  for (const key of LEGACY_QUERY_KEYS) {
    const value = route.queryParamMap.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export const dashboardAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const redirectTo = authService.resolveRedirectPath(state.url, '/dashboard');

  const ensureSession$ = authService.ensureSession().pipe(
    map((isValid) => {
      if (isValid && authService.currentUser) {
        return true;
      }

      return router.createUrlTree(['/dashboard/login'], {
        queryParams: { redirectTo },
      });
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/dashboard/login'], {
          queryParams: { redirectTo },
        }),
      ),
    ),
  );

  const storedLegacyUser = authService.getLegacyUserSnapshot();
  if (!authService.currentUser && storedLegacyUser) {
    const legacyHeader = authService.getLegacyUserHeader();
    return of(
      router.createUrlTree(['/password-reset'], {
        queryParams: legacyHeader ? { userId: legacyHeader } : undefined,
      }),
    );
  }

  const legacyUserId = extractLegacyUserId(route);

  if (!authService.currentUser && legacyUserId) {
    authService.setLegacyUserId(legacyUserId);

    return authService.checkLegacyUser({ force: true }).pipe(
      switchMap((legacyUser) => {
        if (legacyUser) {
          return of(
            router.createUrlTree(['/password-reset'], {
              queryParams: { userId: legacyUserId },
            }),
          );
        }

        return ensureSession$;
      }),
      catchError(() => ensureSession$),
    );
  }

  return ensureSession$;
};
