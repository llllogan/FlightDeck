import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateTabPayload,
  MoveDirection,
  MoveTabPayload,
  RenameTabPayload,
  Tab,
  Environment,
} from '../models';

type TabCreateResponse = Tab & { environment?: Environment };

@Injectable({ providedIn: 'root' })
export class TabsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/tabs`;

  constructor(private readonly http: HttpClient) {}

  createTab(payload: CreateTabPayload): Observable<TabCreateResponse> {
    return this.http.post<TabCreateResponse>(this.baseUrl, payload);
  }

  renameTab(tabId: string, payload: RenameTabPayload): Observable<Tab> {
    return this.http.patch<Tab>(`${this.baseUrl}/${tabId}`, payload);
  }

  moveTab(tabId: string, direction: MoveDirection): Observable<void> {
    const payload: MoveTabPayload = { direction };
    return this.http.post<void>(`${this.baseUrl}/${tabId}/move`, payload);
  }

  deleteTab(tabId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabId}`);
  }
}
