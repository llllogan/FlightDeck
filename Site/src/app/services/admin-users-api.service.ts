import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUser, CreateUserPayload, UpdateUserPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

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
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}
