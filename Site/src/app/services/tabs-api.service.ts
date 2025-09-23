import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateTabPayload, RenameTabPayload, Tab, Environment } from '../models';

type TabCreateResponse = Tab & { environment?: Environment };

@Injectable({ providedIn: 'root' })
export class TabsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/tabs`;

  constructor(private readonly http: HttpClient) {}

  createTab(userId: string, payload: CreateTabPayload): Observable<TabCreateResponse> {
    return this.http.post<TabCreateResponse>(this.baseUrl, payload, {
      headers: this.userHeaders(userId),
    });
  }

  renameTab(userId: string, tabId: string, payload: RenameTabPayload): Observable<Tab> {
    return this.http.patch<Tab>(`${this.baseUrl}/${tabId}`, payload, {
      headers: this.userHeaders(userId),
    });
  }

  deleteTab(userId: string, tabId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabId}`, {
      headers: this.userHeaders(userId),
    });
  }

  private userHeaders(userId: string): HttpHeaders {
    return new HttpHeaders({ 'user_id': userId });
  }
}
