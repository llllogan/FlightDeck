import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loginForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });

  submitting = false;
  error: string | null = null;
  private redirectTo = '/admin';

  ngOnInit(): void {
    this.redirectTo = this.authService.resolveRedirectPath(
      this.route.snapshot.queryParamMap.get('redirectTo'),
      '/admin',
      ['/admin'],
    );

    this.authService
      .ensureSession('admin')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isValid) => {
        if (isValid && this.authService.isAdmin()) {
          void this.router.navigateByUrl(this.redirectTo);
        }
      });
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { name, password } = this.loginForm.getRawValue();

    this.submitting = true;
    this.error = null;

    this.authService
      .login(name.trim(), password)
      .pipe(
        finalize(() => {
          this.submitting = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.redirectTo);
        },
        error: (err) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401 || err.status === 400) {
              this.error = 'Invalid name or password.';
            } else if (err.status === 403) {
              this.error = 'You do not have permission to access the admin panel.';
            } else {
              this.error = 'Unable to log in. Please try again.';
            }
          } else {
            this.error = 'Unable to log in. Please try again.';
          }
        },
      });
  }
}
