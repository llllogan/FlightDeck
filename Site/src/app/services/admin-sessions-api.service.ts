import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AdminSession } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminSessionsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/sessions`;

  constructor(private readonly http: HttpClient) {}

  listSessions(): Observable<AdminSession[]> {
    return this.http.get<AdminSession[]>(this.baseUrl);
  }

  deleteSession(sessionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${sessionId}`);
  }
}
