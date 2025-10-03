import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, LegacyUser } from '../services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
})
export class PasswordResetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly resetForm = this.fb.group({
    name: [{ value: '', disabled: true }],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  submitting = false;
  error: string | null = null;
  private legacyUser: LegacyUser | null = null;

  ngOnInit(): void {
    const queryLegacyId = this.extractLegacyUserId(this.route.snapshot.queryParamMap);
    if (queryLegacyId) {
      this.authService.setLegacyUserId(queryLegacyId);
    }

    this.authService
      .getLegacyUser({ force: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((legacyUser) => {
        if (!legacyUser) {
          void this.router.navigate(['/dashboard/login']);
          return;
        }

        this.legacyUser = legacyUser;
        this.resetForm.patchValue({ name: legacyUser.name });
      });

    this.passwordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordMismatchError());

    this.confirmPasswordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordMismatchError());
  }

  submit(): void {
    if (!this.legacyUser) {
      return;
    }

    this.syncPasswordMismatchError();

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const password = (this.passwordControl.value ?? '').trim();
    const confirmPassword = (this.confirmPasswordControl.value ?? '').trim();

    this.submitting = true;
    this.error = null;

    this.authService
      .resetLegacyPassword(password, confirmPassword)
      .pipe(
        finalize(() => {
          this.submitting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Failed to reset password', err);
          const message = (err?.error?.error as string | undefined) || err?.message;
          this.error = message ?? 'Failed to reset password. Please try again.';
        },
      });
  }

  private syncPasswordMismatchError(): void {
    const password = this.passwordControl.value ?? '';
    const confirm = this.confirmPasswordControl.value ?? '';
    const errors = { ...(this.confirmPasswordControl.errors ?? {}) };

    if (confirm && password !== confirm) {
      errors['mismatch'] = true;
      this.confirmPasswordControl.setErrors(errors);
      return;
    }

    if ('mismatch' in errors) {
      delete errors['mismatch'];
    }

    this.confirmPasswordControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  get passwordControl() {
    return this.resetForm.get('password')!;
  }

  get confirmPasswordControl() {
    return this.resetForm.get('confirmPassword')!;
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
