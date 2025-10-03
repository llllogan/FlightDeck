import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { dashboardAuthGuard } from './guards/dashboard-auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./admin/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'dashboard/login',
    loadComponent: () => import('./dashboard/dashboard-login.component').then((m) => m.DashboardLoginComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./auth/legacy-redirect.component').then((m) => m.LegacyRedirectComponent),
  },
  {
    path: 'password-reset',
    loadComponent: () => import('./auth/password-reset.component').then((m) => m.PasswordResetComponent),
  },
  {
    path: 'dashboard',
    canActivate: [dashboardAuthGuard],
    loadComponent: () => import('./workspace/workspace.component').then((m) => m.WorkspaceComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
