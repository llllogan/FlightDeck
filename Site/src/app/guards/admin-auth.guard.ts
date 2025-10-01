import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((isValid) => {
      if (isValid && authService.isAdmin()) {
        return true;
      }

      return router.createUrlTree(['/admin/login'], {
        queryParams: { redirectTo: state.url },
      });
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/admin/login'], {
          queryParams: { redirectTo: state.url },
        }),
      ),
    ),
  );
};
