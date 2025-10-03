import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const dashboardAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const redirectTo = authService.resolveRedirectPath(state.url, '/dashboard');

  return authService.ensureSession().pipe(
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
};
