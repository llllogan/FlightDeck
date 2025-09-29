import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUser, CreateUserPayload, UpdateUserPayload, UserSummary, TabGroup, WorkspaceResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  listUsers(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[]>(this.baseUrl);
  }

  createUser(payload: CreateUserPayload): Observable<ApiUser> {
    return this.http.post<ApiUser>(this.baseUrl, payload);
  }

  updateUser(userId: string, payload: UpdateUserPayload): Observable<ApiUser> {
    return this.http.patch<ApiUser>(`${this.baseUrl}/${userId}`, payload);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(this.baseUrl, {
      headers: this.userHeaders(userId),
    });
  }

  getSummary(userId: string): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.baseUrl}/summary`, {
      headers: this.userHeaders(userId),
    });
  }

  getUserTabGroups(userId: string): Observable<TabGroup[]> {
    return this.http.get<TabGroup[]>(`${this.baseUrl}/tab-groups`, {
      headers: this.userHeaders(userId),
    });
  }

  getWorkspace(userId: string): Observable<WorkspaceResponse> {
    return this.http.get<WorkspaceResponse>(`${this.baseUrl}/workspace`, {
      headers: this.userHeaders(userId),
    });
  }

  private userHeaders(userId: string): HttpHeaders {
    return new HttpHeaders({ 'x-user-id': userId });
  }
}
