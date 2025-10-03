import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
        tap((value) => {
          if (!value) {
            this.nameStatus = 'idle';
          } else {
            this.nameStatus = 'checking';
          }
        }),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          if (!value) {
            return of(null);
          }
          return this.authService.checkUsernameAvailability(value).pipe(
            map((available) => ({ available, value })),
            catchError(() => {
              this.nameStatus = 'error';
              return of(null);
            }),
          );
        }),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.nameStatus = result.available ? 'available' : 'taken';
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

    this.authService
      .checkUsernameAvailability(name)
      .pipe(take(1))
      .subscribe({
        next: (available) => {
          if (!available) {
            this.nameStatus = 'taken';
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
                const message = (err?.error?.error as string | undefined) || err?.message;
                this.error = message ?? 'Could not create account. Please try again.';
              },
            });
        },
        error: () => {
          this.nameStatus = 'error';
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
        return 'text-amber-400';
      case 'available':
        return 'text-slate-300';
      case 'taken':
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-400';
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
}
