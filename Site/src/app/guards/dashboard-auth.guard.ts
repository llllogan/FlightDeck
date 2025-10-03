import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const dashboardAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((isValid) =>
      isValid && authService.currentUser
        ? true
        : router.createUrlTree(['/dashboard/login'], {
            queryParams: { redirectTo: state.url },
          }),
    ),
    catchError(() =>
      of(
        router.createUrlTree(['/dashboard/login'], {
          queryParams: { redirectTo: state.url },
        }),
      ),
    ),
  );
};
