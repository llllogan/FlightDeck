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
    canActivateChild: [adminAuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'users',
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'sessions',
        loadComponent: () => import('./admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: '**',
        redirectTo: 'users',
      },
    ],
  },
  {
    path: 'dashboard/login',
    loadComponent: () => import('./dashboard/dashboard-login.component').then((m) => m.DashboardLoginComponent),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./auth/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard/login',
  },
  {
    path: 'dashboard',
    canActivate: [dashboardAuthGuard],
    loadComponent: () => import('./workspace/workspace.component').then((m) => m.WorkspaceComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
