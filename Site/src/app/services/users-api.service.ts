import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserSummary, TabGroup, WorkspaceResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getSummary(): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.baseUrl}/summary`);
  }

  getUserTabGroups(): Observable<TabGroup[]> {
    return this.http.get<TabGroup[]>(`${this.baseUrl}/tab-groups`);
  }

  getWorkspace(): Observable<WorkspaceResponse> {
    return this.http.get<WorkspaceResponse>(`${this.baseUrl}/workspace`);
  }
}
