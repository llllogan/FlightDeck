import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateTabGroupPayload,
  MoveDirection,
  MoveTabGroupPayload,
  RenameTabGroupPayload,
  Tab,
  TabGroup,
  TabGroupSummary,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TabGroupsApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/tab-groups`;

  constructor(private readonly http: HttpClient) {}

  listTabGroups(): Observable<TabGroup[]> {
    return this.http.get<TabGroup[]>(this.baseUrl);
  }

  createTabGroup(payload: CreateTabGroupPayload): Observable<TabGroup> {
    return this.http.post<TabGroup>(this.baseUrl, payload);
  }

  renameTabGroup(tabGroupId: string, payload: RenameTabGroupPayload): Observable<TabGroup> {
    return this.http.patch<TabGroup>(`${this.baseUrl}/${tabGroupId}`, payload);
  }

  moveTabGroup(tabGroupId: string, direction: MoveDirection): Observable<void> {
    const payload: MoveTabGroupPayload = { direction };
    return this.http.post<void>(`${this.baseUrl}/${tabGroupId}/move`, payload);
  }

  deleteTabGroup(tabGroupId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabGroupId}`);
  }

  getSummary(): Observable<TabGroupSummary[]> {
    return this.http.get<TabGroupSummary[]>(`${this.baseUrl}/summary`);
  }

  listTabsForGroup(tabGroupId: string): Observable<Tab[]> {
    return this.http.get<Tab[]>(`${this.baseUrl}/${tabGroupId}/tabs`);
  }
}
