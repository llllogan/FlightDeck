import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-legacy-redirect',
  standalone: true,
  template: '',
})
export class LegacyRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const legacyUserId = this.extractLegacyUserId(this.route.snapshot.queryParamMap);

    if (legacyUserId) {
      this.authService.setLegacyUserId(legacyUserId);
      this.authService
        .checkLegacyUser({ force: true })
        .pipe(take(1))
        .subscribe({
          next: (legacyUser) => {
            if (legacyUser) {
              void this.router.navigate(['/password-reset'], {
                replaceUrl: true,
                queryParams: { userId: legacyUserId },
              });
            } else {
              void this.router.navigate(['/dashboard/login'], { replaceUrl: true });
            }
          },
          error: () => {
            void this.router.navigate(['/dashboard/login'], { replaceUrl: true });
          },
        });
      return;
    }

    void this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  private extractLegacyUserId(paramMap: ParamMap): string | null {
    const candidateKeys = ['userId', 'userid', 'user', 'legacyUserId'];

    for (const key of candidateKeys) {
      const value = paramMap.get(key);
      if (value && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
