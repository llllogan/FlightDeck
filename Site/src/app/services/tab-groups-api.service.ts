import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  listTabGroups(userId: string): Observable<TabGroup[]> {
    return this.http.get<TabGroup[]>(this.baseUrl, {
      headers: this.userHeaders(userId),
    });
  }

  createTabGroup(userId: string, payload: CreateTabGroupPayload): Observable<TabGroup> {
    return this.http.post<TabGroup>(this.baseUrl, payload, {
      headers: this.userHeaders(userId),
    });
  }

  renameTabGroup(userId: string, tabGroupId: string, payload: RenameTabGroupPayload): Observable<TabGroup> {
    return this.http.patch<TabGroup>(`${this.baseUrl}/${tabGroupId}`, payload, {
      headers: this.userHeaders(userId),
    });
  }

  moveTabGroup(userId: string, tabGroupId: string, direction: MoveDirection): Observable<void> {
    const payload: MoveTabGroupPayload = { direction };
    return this.http.post<void>(`${this.baseUrl}/${tabGroupId}/move`, payload, {
      headers: this.userHeaders(userId),
    });
  }

  deleteTabGroup(userId: string, tabGroupId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabGroupId}`, {
      headers: this.userHeaders(userId),
    });
  }

  getSummary(userId: string): Observable<TabGroupSummary[]> {
    return this.http.get<TabGroupSummary[]>(`${this.baseUrl}/summary`, {
      headers: this.userHeaders(userId),
    });
  }

  listTabsForGroup(userId: string, tabGroupId: string): Observable<Tab[]> {
    return this.http.get<Tab[]>(`${this.baseUrl}/${tabGroupId}/tabs`, {
      headers: this.userHeaders(userId),
    });
  }

  private userHeaders(userId: string): HttpHeaders {
    return new HttpHeaders({ 'user_id': userId });
  }
}
