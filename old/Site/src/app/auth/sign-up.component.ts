import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { of, take } from 'rxjs';

type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
})
export class SignUpComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly signUpForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  nameStatus: NameStatus = 'idle';
  submitting = false;
  error: string | null = null;

  ngOnInit(): void {
    this.signUpForm.controls.name.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((value) => value.trim()),
        distinctUntilChanged(),
        tap((value) => {
          if (!value) {
            this.updateNameStatus('idle');
          } else {
            this.updateNameStatus('checking');
          }
        }),
        debounceTime(250),
        switchMap((value) => {
          const trimmed = value.trim();
          if (!trimmed) {
            return of<{ available: boolean; value: string } | null>(null);
          }

          return this.authService.checkUsernameAvailability(trimmed).pipe(
            map((available) => ({ available, value: trimmed })),
            catchError(() => {
              this.updateNameStatus('error');
              return of(null);
            }),
          );
        }),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        if (result.value !== this.signUpForm.controls.name.value.trim()) {
          return;
        }

        this.updateNameStatus(result.available ? 'available' : 'taken');
      });

    this.passwordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordMismatchError());

    this.confirmPasswordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordMismatchError());
  }

  submit(): void {
    this.syncPasswordMismatchError();

    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const name = this.signUpForm.controls.name.value.trim();
    const password = this.passwordControl.value.trim();
    const confirmPassword = this.confirmPasswordControl.value.trim();

    if (password !== confirmPassword) {
      this.confirmPasswordControl.setErrors({ ...(this.confirmPasswordControl.errors ?? {}), mismatch: true });
      this.confirmPasswordControl.markAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    this.updateNameStatus('checking');

    this.authService
      .checkUsernameAvailability(name)
      .pipe(take(1))
      .subscribe({
        next: (available) => {
          this.updateNameStatus(available ? 'available' : 'taken');

          if (!available) {
            this.submitting = false;
            return;
          }

          this.authService
            .register(name, password)
            .pipe(
              finalize(() => {
                this.submitting = false;
              }),
            )
            .subscribe({
              next: () => {
                void this.router.navigate(['/dashboard']);
              },
              error: (err) => {
                this.updateNameStatus('error');
                const message = (err?.error?.error as string | undefined) || err?.message;
                this.error = message ?? 'Could not create account. Please try again.';
              },
            });
        },
        error: () => {
          this.updateNameStatus('error');
          this.error = 'Unable to verify username. Please try again.';
          this.submitting = false;
        },
      });
  }

  get passwordControl() {
    return this.signUpForm.get('password')!;
  }

  get confirmPasswordControl() {
    return this.signUpForm.get('confirmPassword')!;
  }

  get nameControl() {
    return this.signUpForm.get('name')!;
  }

  get isNameChecking(): boolean {
    return this.nameStatus === 'checking';
  }

  get isNameTaken(): boolean {
    return this.nameStatus === 'taken';
  }

  get isNameAvailable(): boolean {
    return this.nameStatus === 'available';
  }

  get nameStatusClass(): string {
    switch (this.nameStatus) {
      case 'checking':
        return 'text-amber-500 dark:text-amber-300';
      case 'available':
        return 'text-emerald-600 dark:text-emerald-300';
      case 'taken':
      case 'error':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-slate-400 dark:text-slate-500';
    }
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

  private updateNameStatus(status: NameStatus): void {
    if (this.nameStatus === status) {
      return;
    }

    this.nameStatus = status;
    this.cdr.markForCheck();
  }
}
