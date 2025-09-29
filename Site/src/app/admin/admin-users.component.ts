import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminUsersApiService } from '../services/admin-users-api.service';
import { AuthService } from '../services/auth.service';
import { ApiUser } from '../models';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('createUserFormRef')
  private createUserFormRef?: ElementRef<HTMLFormElement>;

  readonly createUserForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    role: [''],
    password: [''],
  });

  users: ApiUser[] = [];
  loadingUsers = false;
  loadError: string | null = null;
  submitting = false;
  submissionError: string | null = null;
  deletingIds = new Set<string>();
  editingUser: ApiUser | null = null;
  updating = false;
  updateError: string | null = null;
  readonly displayedColumns: string[] = ['name', 'role', 'id', 'created', 'actions'];
  createAttempted = false;
  readonly currentAdmin$ = this.authService.user$;

  readonly editUserForm = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    role: this.formBuilder.control<string | null>(''),
    password: this.formBuilder.control(''),
    clearPassword: this.formBuilder.control(false),
  });

  private readonly destroyRef = inject(DestroyRef);

  private readonly document = inject(DOCUMENT);

  constructor(
    private readonly adminUsersApi: AdminUsersApiService,
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  get hasUsers(): boolean {
    return this.users.length > 0;
  }

  fetchUsers(): void {
    this.loadingUsers = true;
    this.loadError = null;
    this.adminUsersApi
      .listUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users = [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.loadingUsers = false;
        },
        error: (error) => {
          console.error('Failed to load users', error);
          this.loadError = 'Unable to fetch users.';
          this.loadingUsers = false;
          this.handleAuthError(error);
        },
      });
  }

  submit(): void {
    this.createAttempted = true;

    if (this.createUserForm.invalid) {
      return;
    }

    const name = this.createUserForm.controls.name.value.trim();
    const roleInput = this.createUserForm.controls.role.value;
    const passwordInput = this.createUserForm.controls.password.value;
    if (!name) {
      this.createUserForm.controls.name.setErrors({ required: true });
      return;
    }

    const payload: { name: string; role?: string | null; password?: string | null } = { name };

    if (typeof roleInput === 'string') {
      const trimmedRole = roleInput.trim();
      if (trimmedRole) {
        payload.role = trimmedRole;
      }
    }

    if (typeof passwordInput === 'string') {
      const trimmedPassword = passwordInput.trim();
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }
    }

    this.submitting = true;
    this.submissionError = null;

    this.adminUsersApi
      .createUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.createUserForm.controls.name.setValue('');
          this.createUserForm.controls.role.setValue('');
          this.createUserForm.controls.password.setValue('');
          this.createAttempted = false;
          this.blurActiveCreateInput();
          const nextUsers = [user, ...this.users.filter((existing) => existing.id !== user.id)];
          this.users = nextUsers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.submitting = false;
        },
        error: (error) => {
          console.error('Failed to create user', error);
          this.submissionError = 'Unable to create user.';
          this.submitting = false;
          this.handleAuthError(error);
        },
      });
  }

  startEdit(user: ApiUser): void {
    this.editingUser = user;
    this.updateError = null;
    this.updating = false;

    this.editUserForm.reset({
      name: user.name,
      role: user.role ?? '',
      password: '',
      clearPassword: false,
    });
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.updating = false;
    this.updateError = null;
    this.editUserForm.reset({
      name: '',
      role: '',
      password: '',
      clearPassword: false,
    });
  }

  submitEdit(): void {
    if (!this.editingUser) {
      return;
    }

    if (this.editUserForm.invalid) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    const value = this.editUserForm.getRawValue();
    const payload: { name?: string; role?: string | null; password?: string | null } = {};

    const trimmedName = value.name.trim();
    if (!trimmedName) {
      this.editUserForm.controls.name.setErrors({ required: true });
      return;
    }

    if (trimmedName !== this.editingUser.name) {
      payload.name = trimmedName;
    }

    const currentRole = this.editingUser.role ?? null;
    const desiredRole = typeof value.role === 'string' ? value.role.trim() : '';
    const normalizedRole = desiredRole ? desiredRole : null;
    if (normalizedRole !== currentRole) {
      payload.role = normalizedRole;
    }

    if (value.clearPassword) {
      payload.password = null;
    } else if (typeof value.password === 'string') {
      const trimmedPassword = value.password.trim();
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }
    }

    if (Object.keys(payload).length === 0) {
      this.updateError = 'No changes to save.';
      return;
    }

    this.updating = true;
    this.updateError = null;

    this.adminUsersApi
      .updateUser(this.editingUser.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users = this.users.map((existing) => (existing.id === updated.id ? updated : existing));
          this.updating = false;
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Failed to update user', error);
          this.updateError = 'Unable to update user.';
          this.updating = false;
          this.handleAuthError(error);
        },
      });
  }

  deleteUser(user: ApiUser): void {
    const defaultView = this.document.defaultView;
    const trimmedName = user.name.trim();
    const displayName = trimmedName ? ` "${trimmedName}"` : '';
    const confirmed = defaultView ? defaultView.confirm(`Are you sure you want to delete${displayName}?`) : true;

    if (!confirmed) {
      return;
    }

    if (this.deletingIds.has(user.id)) {
      return;
    }

    const deleting = new Set(this.deletingIds);
    deleting.add(user.id);
    this.deletingIds = deleting;

    this.adminUsersApi
      .deleteUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.users = this.users.filter((existing) => existing.id !== user.id);
          const updated = new Set(this.deletingIds);
          updated.delete(user.id);
          this.deletingIds = updated;
          if (this.editingUser?.id === user.id) {
            this.cancelEdit();
          }
        },
        error: (error) => {
          console.error('Failed to delete user', error);
          const updated = new Set(this.deletingIds);
          updated.delete(user.id);
          this.deletingIds = updated;
          this.handleAuthError(error);
        },
      });
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => console.error('Failed to log out', error),
      });
  }

  private handleAuthError(error: unknown): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      this.authService.handleAuthFailure();
    }
  }

  private blurActiveCreateInput(): void {
    const formElement = this.createUserFormRef?.nativeElement;
    const activeElement = this.document?.activeElement as HTMLElement | null;

    if (!formElement || !activeElement) {
      return;
    }

    if (formElement.contains(activeElement)) {
      activeElement.blur();
    }
  }
}
