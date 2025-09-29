import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./workspace/workspace.component').then((m) => m.WorkspaceComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  { path: '**', redirectTo: '' },
];
