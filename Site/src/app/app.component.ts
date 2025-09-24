import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  Environment,
  Tab,
  TabGroup,
  UserSummary,
  CreateTabPayload,
  WorkspaceResponse,
} from './models';
import { CurrentUserService } from './services/current-user.service';
import { UsersApiService } from './services/users-api.service';
import { TabGroupsApiService } from './services/tab-groups-api.service';
import { TabsApiService } from './services/tabs-api.service';
import { ConstsApiService } from './services/consts-api.service';

interface TabViewModel {
  tab: Tab;
  environments: Environment[];
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
  openEnvironmentMenuForTab: string | null = null;

  private userId: string | null = null;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly currentUser: CurrentUserService,
    private readonly usersApi: UsersApiService,
    private readonly tabGroupsApi: TabGroupsApiService,
    private readonly tabsApi: TabsApiService,
    private readonly constsApi: ConstsApiService,
  ) {
    this.currentUser.userId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((userId) => {
        if (userId) {
          this.userId = userId;
          this.loadEnvironmentCodes();
          this.loadWorkspace(userId);
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

  isEnvironmentMenuOpen(tabId: string): boolean {
    return this.openEnvironmentMenuForTab === tabId;
  }

  toggleEnvironmentMenu(event: MouseEvent, tabId: string): void {
    event.stopPropagation();
    this.openEnvironmentMenuForTab = this.openEnvironmentMenuForTab === tabId ? null : tabId;
  }

  @HostListener('document:click')
  closeEnvironmentMenu(): void {
    this.openEnvironmentMenuForTab = null;
  }

  launchPrimaryEnvironment(tabView: TabViewModel): void {
    if (!this.canLaunch(tabView)) {
      return;
    }

    this.openEnvironmentMenuForTab = null;
    this.openEnvironment(tabView.primaryEnvironment);
  }

  onCardKeydown(event: Event, tabView: TabViewModel): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (!this.canLaunch(tabView)) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.launchPrimaryEnvironment(tabView);
    }
  }

  openEnvironment(environment?: Environment, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!environment?.url) {
      return;
    }

    const urlToOpen = this.normalizeForNavigation(environment.url);
    window.open(urlToOpen, '_blank', 'noopener');
    this.openEnvironmentMenuForTab = null;
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

  private normalizeForNavigation(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      return this.normalizeUrl(url);
    }
  }

  canLaunch(tabView: TabViewModel): boolean {
    return Boolean(tabView.primaryEnvironment?.url);
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
        next: () => this.loadWorkspace(this.userId!),
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
        next: () => this.loadWorkspace(this.userId!),
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

  private loadWorkspace(userId: string): void {
    this.loading = true;
    this.error = null;
    this.sections = [];

    this.usersApi
      .getWorkspace(userId)
      .pipe(
        catchError((err) => {
          this.handleError('Failed to load workspace.', err);
          return of<WorkspaceResponse | null>(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((workspace) => {
        if (!workspace) {
          return;
        }

        this.summary = workspace.summary;
        this.sections = workspace.tabGroups.map((group) => ({
          group: {
            id: group.id,
            title: group.title,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
          },
          tabs: group.tabs.map((tab) => ({
            tab: {
              id: tab.id,
              title: tab.title,
              createdAt: tab.createdAt,
              updatedAt: tab.updatedAt,
            },
            environments: tab.environments,
            primaryEnvironment: this.getPrimaryEnvironment(tab.environments),
          })),
        }));

        this.loading = false;
        this.error = null;
      });
  }

  private getPrimaryEnvironment(environments: Environment[]): Environment | undefined {
    const prd = environments.find((env) => env.name.toLowerCase() === 'prd');
    return prd ?? environments[0];
  }

  private handleError(message: string, err: unknown): void {
    console.error(message, err);
    this.error = message;
    this.loading = false;
    this.sections = [];
  }
}
