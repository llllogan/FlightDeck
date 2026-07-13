import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateEnvironmentRequest, Environment, UpdateEnvironmentPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class EnvironmentsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/environments`;

  constructor(private readonly http: HttpClient) {}

  listByTab(tabId: string): Observable<Environment[]> {
    return this.http.get<Environment[]>(`${this.baseUrl}/tabs/${tabId}`);
  }

  create(payload: CreateEnvironmentRequest): Observable<Environment> {
    return this.http.post<Environment>(this.baseUrl, payload);
  }

  update(environmentId: string, payload: UpdateEnvironmentPayload): Observable<Environment> {
    return this.http.patch<Environment>(`${this.baseUrl}/${environmentId}`, payload);
  }

  delete(environmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${environmentId}`);
  }
}
