import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsersApiService } from '../services/users-api.service';
import { ApiUser } from '../models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
})
export class AdminUsersComponent implements OnInit {
  readonly createUserForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    adminPassword: [''],
  });

  users: ApiUser[] = [];
  loadingUsers = false;
  loadError: string | null = null;
  submitting = false;
  submissionError: string | null = null;
  deletingIds = new Set<string>();

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly usersApi: UsersApiService, private readonly formBuilder: FormBuilder) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  get hasUsers(): boolean {
    return this.users.length > 0;
  }

  fetchUsers(): void {
    this.loadingUsers = true;
    this.loadError = null;
    this.usersApi
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
        },
      });
  }

  submit(): void {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    const name = this.createUserForm.controls.name.value.trim();
    const adminPassword = this.createUserForm.controls.adminPassword.value.trim();

    if (!name) {
      this.createUserForm.controls.name.setErrors({ required: true });
      return;
    }

    this.submitting = true;
    this.submissionError = null;

    this.usersApi
      .createUser({ name }, adminPassword ? adminPassword : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.createUserForm.controls.name.setValue('');
          const nextUsers = [user, ...this.users.filter((existing) => existing.id !== user.id)];
          this.users = nextUsers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.submitting = false;
        },
        error: (error) => {
          console.error('Failed to create user', error);
          this.submissionError = 'Unable to create user.';
          this.submitting = false;
        },
      });
  }

  deleteUser(user: ApiUser): void {
    if (this.deletingIds.has(user.id)) {
      return;
    }

    const deleting = new Set(this.deletingIds);
    deleting.add(user.id);
    this.deletingIds = deleting;

    this.usersApi
      .deleteUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.users = this.users.filter((existing) => existing.id !== user.id);
          const updated = new Set(this.deletingIds);
          updated.delete(user.id);
          this.deletingIds = updated;
        },
        error: (error) => {
          console.error('Failed to delete user', error);
          const updated = new Set(this.deletingIds);
          updated.delete(user.id);
          this.deletingIds = updated;
        },
      });
  }
}
