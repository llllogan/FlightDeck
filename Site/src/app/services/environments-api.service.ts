import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateEnvironmentRequest, Environment, UpdateEnvironmentPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class EnvironmentsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/environments`;

  constructor(private readonly http: HttpClient) {}

  listByTab(userId: string, tabId: string): Observable<Environment[]> {
    return this.http.get<Environment[]>(`${this.baseUrl}/tabs/${tabId}`, {
      headers: this.userHeaders(userId),
    });
  }

  create(userId: string, payload: CreateEnvironmentRequest): Observable<Environment> {
    return this.http.post<Environment>(this.baseUrl, payload, {
      headers: this.userHeaders(userId),
    });
  }

  update(userId: string, environmentId: string, payload: UpdateEnvironmentPayload): Observable<Environment> {
    return this.http.patch<Environment>(`${this.baseUrl}/${environmentId}`, payload, {
      headers: this.userHeaders(userId),
    });
  }

  delete(userId: string, environmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${environmentId}`, {
      headers: this.userHeaders(userId),
    });
  }

  private userHeaders(userId: string): HttpHeaders {
    return new HttpHeaders({ 'x-user-id': userId });
  }
}
