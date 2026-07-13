import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HealthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/health`;

  constructor(private readonly http: HttpClient) {}

  check(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(this.baseUrl);
  }
}
