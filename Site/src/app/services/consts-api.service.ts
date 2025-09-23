import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EnvironmentCodesResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ConstsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/consts`;

  constructor(private readonly http: HttpClient) {}

  getEnvironmentCodes(): Observable<string[]> {
    return this.http
      .get<EnvironmentCodesResponse>(`${this.baseUrl}/environments`)
      .pipe(map((response) => response.environments));
  }
}
