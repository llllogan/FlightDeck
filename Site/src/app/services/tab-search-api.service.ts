import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TabSearchResult } from '../models';

@Injectable({ providedIn: 'root' })
export class TabSearchApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/search/tabs`;

  constructor(private readonly http: HttpClient) {}

  search(query: string): Observable<TabSearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<TabSearchResult[]>(this.baseUrl, { params });
  }
}
