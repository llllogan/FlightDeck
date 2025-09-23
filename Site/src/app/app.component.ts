import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { Environment, Tab, TabGroup, UserSummary, CreateTabPayload } from './models';
import { CurrentUserService } from './services/current-user.service';
import { UsersApiService } from './services/users-api.service';
import { TabGroupsApiService } from './services/tab-groups-api.service';
import { TabsApiService } from './services/tabs-api.service';
import { EnvironmentsApiService } from './services/environments-api.service';
import { ConstsApiService } from './services/consts-api.service';

interface TabViewModel {
  tab: Tab;
  primaryEnvironment?: Environment;
}

interface TabSection {
  group: TabGroup;
  tabs: TabViewModel[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  summary: UserSummary | null = null;
  sections: TabSection[] = [];
  environmentCodes: string[] = [];
  loading = false;
  error: string | null = null;

  private userId: string | null = null;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly currentUser: CurrentUserService,
    private readonly usersApi: UsersApiService,
    private readonly tabGroupsApi: TabGroupsApiService,
    private readonly tabsApi: TabsApiService,
    private readonly environmentsApi: EnvironmentsApiService,
    private readonly constsApi: ConstsApiService,
  ) {
    this.currentUser.userId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((userId) => {
        if (userId) {
          this.userId = userId;
          this.loadEnvironmentCodes();
          this.loadSummary(userId);
          this.loadSections(userId);
        }
      });
  }

  ngOnInit(): void {
    this.currentUser
      .initialize()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => this.handleError('Failed to initialize user context.', err),
      });
  }

  getFavicon(url: string): string {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return '';
    }
  }

  private normalizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      return '';
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  addSection(): void {
    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    const name = (window.prompt('New tab group name:') || '').trim();
    if (!name) {
      return;
    }

    this.error = null;

    this.tabGroupsApi
      .createTabGroup(this.userId, { title: name })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadSections(this.userId!);
          this.loadSummary(this.userId!);
        },
        error: (err) => this.handleError('Failed to create tab group.', err),
      });
  }

  addTab(sectionIndex: number): void {
    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    const section = this.sections[sectionIndex];
    if (!section) {
      return;
    }

    const titleInput = window.prompt('Tab title:');
    if (!titleInput) {
      return;
    }

    const title = titleInput.trim();
    if (!title) {
      return;
    }

    const envNameDefault = this.environmentCodes[0] ?? 'production';
    const environmentNameInput = (window.prompt('Environment name:', envNameDefault) || envNameDefault).trim();
    const environmentName = environmentNameInput || envNameDefault;

    const urlInput = window.prompt('Environment URL (e.g. example.com):');
    if (!urlInput) {
      return;
    }

    const normalizedUrl = this.normalizeUrl(urlInput);
    try {
      // Validate URL before sending to the API
      new URL(normalizedUrl);
    } catch {
      window.alert('Invalid URL');
      return;
    }

    const payload: CreateTabPayload = {
      tabGroupId: section.group.id,
      title,
      environment: {
        name: environmentName,
        url: normalizedUrl,
      },
    };

    this.error = null;

    this.tabsApi
      .createTab(this.userId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadSections(this.userId!);
          this.loadSummary(this.userId!);
        },
        error: (err) => this.handleError('Failed to create tab.', err),
      });
  }

  private loadEnvironmentCodes(): void {
    if (this.environmentCodes.length) {
      return;
    }

    this.constsApi
      .getEnvironmentCodes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (codes) => (this.environmentCodes = codes),
        error: (err) => console.warn('Failed to load environment codes', err),
      });
  }

  private loadSummary(userId: string): void {
    this.usersApi
      .getSummary(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => (this.summary = summary),
        error: (err) => this.handleError('Failed to load workspace summary.', err),
      });
  }

  private loadSections(userId: string): void {
    this.loading = true;
    this.error = null;
    this.sections = [];

    this.tabGroupsApi
      .listTabGroups(userId)
      .pipe(
        switchMap((groups) => {
          if (!groups.length) {
            return of([] as TabSection[]);
          }

          const groupRequests = groups.map((group) =>
            this.tabGroupsApi.listTabsForGroup(userId, group.id).pipe(
              catchError(() => of([] as Tab[])),
              switchMap((tabs) => {
                if (!tabs.length) {
                  return of({ group, tabs: [] as TabViewModel[] });
                }

                const tabRequests = tabs.map((tab) =>
                  this.environmentsApi.listByTab(userId, tab.id).pipe(
                    map((envs) => ({
                      tab,
                      primaryEnvironment: envs[0],
                    })),
                    catchError(() => of({ tab, primaryEnvironment: undefined })),
                  ),
                );

                return forkJoin(tabRequests).pipe(
                  map((tabModels) => ({
                    group,
                    tabs: tabModels,
                  })),
                );
              }),
            ),
          );

          return forkJoin(groupRequests);
        }),
        catchError((err) => {
          this.handleError('Failed to load tab groups.', err);
          return of([] as TabSection[]);
        }),
        finalize(() => {
          this.loading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sections) => {
        this.sections = sections;
        this.error = null;
        this.loading = false;
      });
  }

  private handleError(message: string, err: unknown): void {
    console.error(message, err);
    this.error = message;
    this.loading = false;
    this.sections = [];
  }
}
