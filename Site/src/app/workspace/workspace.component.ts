import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import {
  Environment,
  MoveDirection,
  Tab,
  TabGroup,
  UserSummary,
  CreateTabPayload,
  WorkspaceResponse,
  TabSearchResult,
} from '../models';
import { CurrentUserService } from '../services/current-user.service';
import { UsersApiService } from '../services/users-api.service';
import { TabGroupsApiService } from '../services/tab-groups-api.service';
import { TabsApiService } from '../services/tabs-api.service';
import { EnvironmentsApiService } from '../services/environments-api.service';
import { ConstsApiService } from '../services/consts-api.service';
import { TabSearchApiService } from '../services/tab-search-api.service';
import { environment as appEnvironment } from '../../environments/environment';

interface TabViewModel {
  tab: Tab;
  environments: Environment[];
  primaryEnvironment?: Environment;
  faviconUrl: string | null;
}

interface TabSection {
  group: TabGroup;
  tabs: TabViewModel[];
}

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css'],
})
export class WorkspaceComponent implements OnInit, AfterViewInit {
  summary: UserSummary | null = null;
  sections: TabSection[] = [];
  environmentCodes: string[] = [];
  loading = false;
  error: string | null = null;
  environmentMenuState: { tabId: string; top: number; left: number; width: number } | null = null;
  addGroupForm: FormGroup | null = null;
  addTabForm: FormGroup | null = null;
  activeTabSectionIndex: number | null = null;
  editTabForm: FormGroup | null = null;
  editingTabContext: { sectionIndex: number; tabIndex: number } | null = null;
  removedEnvironmentIds: Set<string> = new Set();
  originalEnvironmentMap: Map<string, Environment> = new Map();
  editGroupForm: FormGroup | null = null;
  editingGroupContext: { sectionIndex: number } | null = null;
  editingGroupTabs: TabViewModel[] = [];
  @ViewChild('tabSearchInput') tabSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('searchResultButton') searchResultButtons?: QueryList<ElementRef<HTMLButtonElement>>;
  tabSearchControl = new FormControl<string>('', { nonNullable: true });
  searchResults: TabSearchResult[] = [];
  searchLoading = false;
  searchError: string | null = null;
  searchActiveTerm = '';
  searchActiveIndex: number | null = null;
  theme: 'light' | 'dark' = 'light';
  private readonly environmentEmojiMap = new Map<string, string>([
    ['prd', '🟢'],
    ['tst', '🟠'],
    ['dev', '🔴'],
    ['ci', '🟣'],
    ['qa', '🔵'],
    ['local', '🟡'],
  ]);
  private readonly faviconErrorTabIds: Set<string> = new Set();
  private readonly searchTermTrigger$ = new Subject<{ term: string; context: number }>();
  private userContextVersion = 0;
  private hasFocusedSearchInput = false;
  private readonly documentRef = inject(DOCUMENT);
  private readonly themeCookieName = 'flightdeck-theme';
  private readonly themeCookieMaxAgeDays = 365;

  private userId: string | null = null;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly currentUser: CurrentUserService,
    private readonly usersApi: UsersApiService,
    private readonly tabGroupsApi: TabGroupsApiService,
    private readonly tabsApi: TabsApiService,
    private readonly constsApi: ConstsApiService,
    private readonly environmentsApi: EnvironmentsApiService,
    private readonly tabSearchApi: TabSearchApiService,
    private readonly formBuilder: FormBuilder,
    private readonly ngZone: NgZone,
  ) {
    this.initializeTheme();
    this.initializeSearchStream();

    this.currentUser.userId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((userId) => {
        this.runInZone(() => {
          this.userId = userId ?? null;
          this.userContextVersion += 1;
          this.emitSearchTerm(this.searchActiveTerm);

          if (userId) {
            this.loadEnvironmentCodes();
            this.loadWorkspace(userId);
          } else {
            this.summary = null;
            this.sections = [];
            this.searchResults = [];
          }
        });
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

  ngAfterViewInit(): void {
    this.focusSearchInputOnce();
  }

  clearSearch(): void {
    this.tabSearchControl.setValue('');
    this.searchResults = [];
    this.searchError = null;
    this.searchActiveTerm = '';
    this.searchActiveIndex = null;
    this.focusSearchInput();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const term = this.tabSearchControl.value.trim();
    switch (event.key) {
      case 'ArrowDown': {
        if (!this.searchResults.length) {
          return;
        }
        event.preventDefault();
        this.moveSearchHighlight(1);
        break;
      }
      case 'ArrowUp': {
        if (!this.searchResults.length) {
          return;
        }
        event.preventDefault();
        this.moveSearchHighlight(-1);
        break;
      }
      case 'Enter': {
        if (!term) {
          return;
        }

        if (this.searchActiveIndex !== null) {
          const result = this.searchResults[this.searchActiveIndex];
          if (result) {
            event.preventDefault();
            this.launchSearchResult(result);
          }
          return;
        }

        if (!this.searchResults.length) {
          event.preventDefault();
          const encoded = encodeURIComponent(term);
          window.open(`https://www.google.com/search?q=${encoded}`, '_blank', 'noopener');
        }
        break;
      }
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        if (this.searchActiveIndex === null) {
          return;
        }

        const result = this.searchResults[this.searchActiveIndex];
        if (!result) {
          return;
        }

        const environmentIndex = parseInt(event.key, 10) - 1;
        if (environmentIndex < 0) {
          return;
        }

        const environment = result.environments[environmentIndex];
        if (environment?.url) {
          event.preventDefault();
          this.openEnvironment(environment);
        }
        break;
      }
      default:
        break;
    }
  }

  launchSearchResult(result: TabSearchResult, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    const primary = this.getPrimaryEnvironment(result.environments);
    if (!primary?.url) {
      return;
    }

    this.openEnvironment(primary);
  }

  get shouldShowSearchResults(): boolean {
    return Boolean(
      this.searchActiveTerm &&
        (this.searchResults.length > 0 || this.searchLoading || this.searchError),
    );
  }

  trackSearchResult(_index: number, result: TabSearchResult): string {
    return result.tab.id;
  }

  setSearchHighlight(index: number): void {
    this.searchActiveIndex = index;
    this.scrollActiveSearchResultIntoView();
  }

  get activeSearchOptionId(): string | null {
    const index = this.searchActiveIndex;
    if (index === null) {
      return null;
    }

    const result = this.searchResults[index];
    if (!result) {
      return null;
    }

    return `tab-search-option-${result.tab.id}`;
  }

  get isDarkMode(): boolean {
    return this.theme === 'dark';
  }

  get themeToggleLabel(): string {
    return this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkMode ? 'light' : 'dark');
  }

  private initializeSearchStream(): void {
    this.tabSearchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const trimmed = (value ?? '').trim();
        this.searchActiveTerm = trimmed;
        this.searchError = null;
        this.searchActiveIndex = null;
        this.emitSearchTerm(trimmed);
      });

    this.searchTermTrigger$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(200),
        distinctUntilChanged((prev, curr) => prev.term === curr.term && prev.context === curr.context),
        switchMap(({ term, context }) => {
          if (!term || !this.userId) {
            this.searchLoading = false;
            this.searchError = null;
            if (!term) {
              this.searchResults = [];
            }
            return of({ context, results: [] as TabSearchResult[] });
          }

          this.searchLoading = true;
          this.searchError = null;

          return this.tabSearchApi.search(this.userId, term).pipe(
            map((results) => ({ context, results })),
            catchError((err) => {
              console.error('Failed to search tabs', err);
              this.searchLoading = false;
              this.searchError = 'Unable to search tabs right now.';
              return of({ context, results: [] as TabSearchResult[] });
            }),
          );
        }),
      )
      .subscribe(({ context, results }) => {
        if (context !== this.userContextVersion) {
          return;
        }

        this.searchLoading = false;
        this.searchResults = results;
        this.syncSearchHighlight();
      });

    this.emitSearchTerm(this.tabSearchControl.value.trim());
  }

  private emitSearchTerm(term: string): void {
    this.searchTermTrigger$.next({ term, context: this.userContextVersion });
  }

  private initializeTheme(): void {
    const stored = this.getCookie(this.themeCookieName);
    let initial: 'light' | 'dark' = 'light';

    if (stored === 'light' || stored === 'dark') {
      initial = stored;
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      initial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    this.setTheme(initial, false);
  }

  private setTheme(theme: 'light' | 'dark', persist = true): void {
    this.theme = theme;
    const root = this.documentRef?.documentElement;

    if (root) {
      root.classList.toggle('dark', theme === 'dark');
      root.setAttribute('data-theme', theme);
    }

    if (persist) {
      this.setCookie(this.themeCookieName, theme, this.themeCookieMaxAgeDays);
    }
  }

  private setCookie(name: string, value: string, days: number): void {
    const doc = this.documentRef;
    if (!doc) {
      return;
    }

    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const encodedValue = encodeURIComponent(value);
    doc.cookie = `${name}=${encodedValue}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const doc = this.documentRef;
    if (!doc?.cookie) {
      return null;
    }

    const prefix = `${name}=`;
    const match = doc.cookie.split('; ').find((entry) => entry.startsWith(prefix));
    if (!match) {
      return null;
    }

    return decodeURIComponent(match.substring(prefix.length));
  }

  private moveSearchHighlight(offset: number): void {
    if (!this.searchResults.length) {
      this.searchActiveIndex = null;
      return;
    }

    const currentIndex = this.searchActiveIndex ?? (offset > 0 ? -1 : this.searchResults.length);
    let nextIndex = currentIndex + offset;

    if (nextIndex >= this.searchResults.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = this.searchResults.length - 1;
    }

    this.searchActiveIndex = nextIndex;
    this.scrollActiveSearchResultIntoView();
  }

  private focusSearchInput(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.tabSearchInput?.nativeElement.focus({ preventScroll: true });
      });
    });
  }

  private focusSearchInputOnce(): void {
    if (this.hasFocusedSearchInput) {
      return;
    }

    this.hasFocusedSearchInput = true;
    this.focusSearchInput();
  }

  private syncSearchHighlight(): void {
    if (!this.searchResults.length) {
      this.searchActiveIndex = null;
      return;
    }

    if (this.searchActiveIndex === null) {
      this.searchActiveIndex = 0;
      this.scrollActiveSearchResultIntoView();
      return;
    }

    const maxIndex = this.searchResults.length - 1;
    if (this.searchActiveIndex > maxIndex) {
      this.searchActiveIndex = maxIndex;
      this.scrollActiveSearchResultIntoView();
    } else {
      this.scrollActiveSearchResultIntoView();
    }
  }

  private scrollActiveSearchResultIntoView(): void {
    const index = this.searchActiveIndex;
    if (index === null) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        const buttons = this.searchResultButtons?.toArray();
        const active = buttons?.[index]?.nativeElement;
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
  }

  isEnvironmentMenuOpen(tabId: string): boolean {
    return this.environmentMenuState?.tabId === tabId;
  }

  toggleEnvironmentMenu(event: MouseEvent, tabId: string): void {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement | null;

    if (!target) {
      this.environmentMenuState = null;
      return;
    }

    if (this.environmentMenuState?.tabId === tabId) {
      this.environmentMenuState = null;
      return;
    }

    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const menuWidth = Math.max(rect.width, 192);
    let left = rect.left;

    if (left + menuWidth > viewportWidth - 16) {
      left = Math.max(16, viewportWidth - menuWidth - 16);
    }

    this.environmentMenuState = {
      tabId,
      top: rect.bottom + 8,
      left,
      width: menuWidth,
    };
  }

  @HostListener('document:click')
  closeEnvironmentMenu(): void {
    this.environmentMenuState = null;
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  dismissEnvironmentMenuOnViewportChange(): void {
    if (this.environmentMenuState) {
      this.environmentMenuState = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    let closed = false;
    if (this.addGroupForm) {
      this.closeAddGroupModal();
      closed = true;
    }
    if (this.addTabForm) {
      this.closeAddTabModal();
      closed = true;
    }
    if (this.editTabForm) {
      this.closeEditTabModal();
      closed = true;
    }
    if (this.editGroupForm) {
      this.closeEditGroupModal();
      closed = true;
    }

    if (closed) {
      event.preventDefault();
    }
  }

  launchPrimaryEnvironment(tabView: TabViewModel): void {
    if (!this.canLaunch(tabView)) {
      return;
    }

    this.environmentMenuState = null;
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
    window.location.href = urlToOpen;
    this.environmentMenuState = null;
  }

  shouldShowFavicon(tabView: TabViewModel): boolean {
    return Boolean(tabView.faviconUrl) && !this.faviconErrorTabIds.has(tabView.tab.id);
  }

  handleFaviconError(tabView: TabViewModel): void {
    this.ngZone.run(() => {
      this.faviconErrorTabIds.add(tabView.tab.id);
      tabView.faviconUrl = null;
    });
  }

  getMonogram(title: string | null | undefined): string {
    const cleaned = (title ?? '').trim();
    if (!cleaned) {
      return '•';
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const first = words[0]?.charAt(0) ?? '';
      const second = words[1]?.charAt(0) ?? '';
      const monogram = `${first}${second}`.toUpperCase();
      return monogram || cleaned.slice(0, 2).toUpperCase();
    }

    const word = words[0];
    const capitals = word.match(/[A-Z]/g) ?? [];
    if (capitals.length >= 2) {
      return (capitals[0] + capitals[1]).toUpperCase();
    }

    return word.charAt(0).toUpperCase();
  }

  moveTabGroup(sectionIndex: number, direction: MoveDirection, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    const originalIndex = sectionIndex;
    const section = this.sections[originalIndex];
    if (!section) {
      return;
    }

    const targetIndex = direction === 'up' ? originalIndex - 1 : originalIndex + 1;
    if (targetIndex < 0 || targetIndex >= this.sections.length) {
      return;
    }

    this.environmentMenuState = null;
    this.sections = this.reorderList(this.sections, originalIndex, targetIndex);

    if (this.editingGroupContext) {
      if (this.editingGroupContext.sectionIndex === originalIndex) {
        this.editingGroupContext = { sectionIndex: targetIndex };
      } else if (this.editingGroupContext.sectionIndex === targetIndex) {
        this.editingGroupContext = { sectionIndex: originalIndex };
      }
      this.syncEditingGroupTabs();
    }

    this.tabGroupsApi
      .moveTabGroup(this.userId, section.group.id, direction)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.userId) {
            this.loadWorkspace(this.userId);
          }
        },
        error: (err) => {
          console.error('Failed to reorder tab group.', err);
          this.error = 'Failed to reorder tab group.';
          if (this.userId) {
            this.loadWorkspace(this.userId);
          }
        },
      });
  }

  moveTabWithinGroup(tabIndex: number, direction: MoveDirection): void {
    if (!this.userId || !this.editingGroupContext) {
      return;
    }

    const { sectionIndex } = this.editingGroupContext;
    const section = this.sections[sectionIndex];
    const currentTab = this.editingGroupTabs[tabIndex];

    if (!section || !currentTab) {
      return;
    }

    const targetIndex = direction === 'up' ? tabIndex - 1 : tabIndex + 1;
    if (targetIndex < 0 || targetIndex >= this.editingGroupTabs.length) {
      return;
    }

    this.editingGroupTabs = this.reorderList(this.editingGroupTabs, tabIndex, targetIndex);
    this.sections = this.sections.map((s, idx) =>
      idx === sectionIndex ? { ...s, tabs: this.reorderList(s.tabs, tabIndex, targetIndex) } : s,
    );
    this.syncEditingGroupTabs();

    this.tabsApi
      .moveTab(this.userId, currentTab.tab.id, direction)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.userId) {
            this.loadWorkspace(this.userId);
          }
        },
        error: (err) => {
          console.error('Failed to reorder tab.', err);
          this.error = 'Failed to reorder tab.';
          if (this.userId) {
            this.loadWorkspace(this.userId);
          }
        },
      });
  }

  getFavicon(url: string): string | null {
    if (!url) {
      return null;
    }

    try {
      const normalized = this.normalizeForNavigation(url);
      // Validate URL parsing
      new URL(normalized);
      const apiBase = appEnvironment.apiBaseUrl?.replace(/\/$/, '') ?? '';
      return `${apiBase}/favicons?url=${encodeURIComponent(normalized)}`;
    } catch {
      return null;
    }
  }

  getEnvironmentEmoji(name: string | null | undefined): string {
    const normalized = name?.trim().toLowerCase();
    return (normalized && this.environmentEmojiMap.get(normalized)) ?? '⚪️';
  }

  getEnvironmentEmojiSequence(environments: Environment[] | null | undefined): string {
    if (!environments?.length) {
      return '';
    }

    return environments.map((env) => this.getEnvironmentEmoji(env.name)).join('');
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

  openAddGroupModal(): void {
    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    this.environmentMenuState = null;
    this.addGroupForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
    });
  }

  submitAddGroup(): void {
    if (!this.userId || !this.addGroupForm) {
      return;
    }

    if (this.addGroupForm.invalid) {
      this.addGroupForm.markAllAsTouched();
      return;
    }

    const title = (this.addGroupForm.value.title as string).trim();
    if (!title) {
      this.addGroupForm.get('title')?.setErrors({ required: true });
      return;
    }

    this.error = null;

    this.tabGroupsApi
      .createTabGroup(this.userId, { title })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeAddGroupModal();
            this.loadWorkspace(this.userId!);
          }),
        error: (err) => this.handleError('Failed to create tab group.', err),
      });
  }

  closeAddGroupModal(): void {
    this.addGroupForm = null;
  }

  openEditGroupModal(sectionIndex: number, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    const section = this.sections[sectionIndex];
    if (!section) {
      return;
    }

    this.environmentMenuState = null;
    this.editingGroupContext = { sectionIndex };
    this.editGroupForm = this.formBuilder.group({
      title: [section.group.title, [Validators.required, Validators.maxLength(120)]],
    });
    this.editingGroupTabs = [...section.tabs];
  }

  submitEditGroup(): void {
    if (!this.userId || !this.editGroupForm || !this.editingGroupContext) {
      return;
    }

    if (this.editGroupForm.invalid) {
      this.editGroupForm.markAllAsTouched();
      return;
    }

    const { sectionIndex } = this.editingGroupContext;
    const section = this.sections[sectionIndex];
    if (!section) {
      return;
    }

    const newTitle = (this.editGroupForm.value.title as string).trim();
    if (!newTitle) {
      this.editGroupForm.get('title')?.setErrors({ required: true });
      return;
    }

    if (newTitle === section.group.title) {
      this.closeEditGroupModal();
      return;
    }

    this.error = null;

    this.tabGroupsApi
      .renameTabGroup(this.userId, section.group.id, { title: newTitle })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeEditGroupModal();
            this.loadWorkspace(this.userId!);
          }),
        error: (err) => this.handleError('Failed to rename tab group.', err),
      });
  }

  deleteGroupFromModal(): void {
    if (!this.userId || !this.editingGroupContext) {
      return;
    }

    const { sectionIndex } = this.editingGroupContext;
    const section = this.sections[sectionIndex];
    if (!section) {
      return;
    }

    this.error = null;

    this.tabGroupsApi
      .deleteTabGroup(this.userId, section.group.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeEditGroupModal();
            this.loadWorkspace(this.userId!);
          }),
        error: (err) => this.handleError('Failed to delete tab group.', err),
      });
  }

  deleteTabFromGroup(tabId: string): void {
    if (!this.userId) {
      return;
    }

    this.error = null;

    this.tabsApi
      .deleteTab(this.userId, tabId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.environmentMenuState = null;
            this.editingGroupTabs = this.editingGroupTabs.filter((tab) => tab.tab.id !== tabId);
            this.sections = this.sections.map((section) => ({
              ...section,
              tabs: section.tabs.filter((tabView) => tabView.tab.id !== tabId),
            }));
            this.syncEditingGroupTabs();
            this.faviconErrorTabIds.delete(tabId);
            this.loadWorkspace(this.userId!);
          }),
        error: (err) => this.handleError('Failed to delete tab.', err),
      });
  }

  closeEditGroupModal(): void {
    this.editGroupForm = null;
    this.editingGroupContext = null;
    this.editingGroupTabs = [];
    this.environmentMenuState = null;
  }

  openAddTabModal(sectionIndex: number): void {
    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    this.environmentMenuState = null;
    const section = this.sections[sectionIndex];
    if (!section) {
      return;
    }

    this.activeTabSectionIndex = sectionIndex;
    const defaultEnv = this.environmentCodes[0] ?? 'production';

    this.addTabForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
      environmentName: [defaultEnv, [Validators.required, Validators.maxLength(60)]],
      environmentUrl: ['', [Validators.required, Validators.maxLength(2048)]],
    });
  }

  submitAddTab(): void {
    if (!this.userId || this.activeTabSectionIndex === null || !this.addTabForm) {
      return;
    }

    if (this.addTabForm.invalid) {
      this.addTabForm.markAllAsTouched();
      return;
    }

    const section = this.sections[this.activeTabSectionIndex];
    if (!section) {
      return;
    }

    const {
      title,
      environmentName,
      environmentUrl,
    } = this.addTabForm.value as {
      title: string;
      environmentName: string;
      environmentUrl: string;
    };

    const sanitizedTitle = title.trim();
    const sanitizedName = environmentName.trim() || (this.environmentCodes[0] ?? 'production');
    const normalizedUrl = this.normalizeUrl(environmentUrl);

    try {
      new URL(normalizedUrl);
    } catch {
      this.addTabForm.get('environmentUrl')?.setErrors({ invalidUrl: true });
      this.addTabForm.get('environmentUrl')?.markAsTouched();
      return;
    }

    const payload: CreateTabPayload = {
      tabGroupId: section.group.id,
      title: sanitizedTitle,
      environment: {
        name: sanitizedName,
        url: normalizedUrl,
      },
    };

    this.error = null;

    this.tabsApi
      .createTab(this.userId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeAddTabModal();
            this.loadWorkspace(this.userId!);
          }),
        error: (err) => this.handleError('Failed to create tab.', err),
      });
  }

  closeAddTabModal(): void {
    this.addTabForm = null;
    this.activeTabSectionIndex = null;
  }

  openEditTabModal(sectionIndex: number, tabIndex: number, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!this.userId) {
      this.handleError('User context unavailable.', null);
      return;
    }

    const section = this.sections[sectionIndex];
    const tabView = section?.tabs?.[tabIndex];

    if (!section || !tabView) {
      return;
    }

    this.editingTabContext = { sectionIndex, tabIndex };
    this.removedEnvironmentIds = new Set();
    this.originalEnvironmentMap = new Map(
      tabView.environments.map((env) => [env.id, env]),
    );
    this.environmentMenuState = null;

    this.editTabForm = this.formBuilder.group({
      title: [tabView.tab.title, [Validators.required, Validators.maxLength(120)]],
      environments: this.formBuilder.array(
        tabView.environments.map((env) =>
          this.formBuilder.group({
            id: [env.id],
            name: [env.name, [Validators.required, Validators.maxLength(60)]],
            url: [env.url, [Validators.required, Validators.maxLength(2048)]],
          }),
        ),
      ),
    });
  }

  addEnvironmentRow(): void {
    if (!this.editTabForm) {
      return;
    }

    this.environmentControls.push(
      this.formBuilder.group({
        id: [null],
        name: ['', [Validators.required, Validators.maxLength(60)]],
        url: ['', [Validators.required, Validators.maxLength(2048)]],
      }),
    );
  }

  removeEnvironmentRow(index: number): void {
    if (!this.editTabForm) {
      return;
    }

    const control = this.environmentControls.at(index);
    const id = control.get('id')?.value as string | null;
    if (id) {
      this.removedEnvironmentIds.add(id);
    }
    this.environmentControls.removeAt(index);
  }

  submitEditTab(): void {
    if (!this.userId || !this.editTabForm || !this.editingTabContext) {
      return;
    }

    if (this.editTabForm.invalid) {
      this.editTabForm.markAllAsTouched();
      return;
    }

    const { sectionIndex, tabIndex } = this.editingTabContext;
    const section = this.sections[sectionIndex];
    const tabView = section?.tabs?.[tabIndex];

    if (!section || !tabView) {
      return;
    }

    const tabId = tabView.tab.id;
    const newTitle = (this.editTabForm.value.title as string).trim();
    const operations: Observable<unknown>[] = [];
    const shouldDeleteTab = this.environmentControls.length === 0;
    // If no environments remain, delete the tab entirely instead of leaving an empty shell.

    if (!shouldDeleteTab && newTitle && newTitle !== tabView.tab.title) {
      operations.push(this.tabsApi.renameTab(this.userId, tabId, { title: newTitle }));
    }

    let hasValidationError = false;

    if (!shouldDeleteTab) {
      this.environmentControls.controls.forEach((control) => {
        const id = control.get('id')?.value as string | null;
        const nameValue = (control.get('name')?.value as string | '').trim();
        const urlValue = (control.get('url')?.value as string | '').trim();

        if (!nameValue) {
          control.get('name')?.setErrors({ required: true });
          hasValidationError = true;
          return;
        }

        if (!urlValue) {
          control.get('url')?.setErrors({ required: true });
          hasValidationError = true;
          return;
        }

        const normalizedUrl = this.normalizeUrl(urlValue);
        try {
          new URL(normalizedUrl);
        } catch {
          control.get('url')?.setErrors({ invalidUrl: true });
          hasValidationError = true;
          return;
        }

        if (id) {
          const original = this.originalEnvironmentMap.get(id);
          if (!original || original.name !== nameValue || original.url !== normalizedUrl) {
            operations.push(
              this.environmentsApi.update(this.userId!, id, {
                name: nameValue,
                url: normalizedUrl,
              }),
            );
          }
        } else {
          operations.push(
            this.environmentsApi.create(this.userId!, {
              tabId,
              name: nameValue,
              url: normalizedUrl,
            }),
          );
        }
      });
    }

    if (hasValidationError) {
      this.environmentControls.markAllAsTouched();
      return;
    }

    if (shouldDeleteTab) {
      operations.push(this.tabsApi.deleteTab(this.userId!, tabId));
    } else {
      this.removedEnvironmentIds.forEach((envId) => {
        operations.push(this.environmentsApi.delete(this.userId!, envId));
      });
    }

    const request$: Observable<unknown> = operations.length
      ? forkJoin(operations)
      : of(null);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeEditTabModal();
            if (this.userId) {
              this.loadWorkspace(this.userId);
            }
          }),
        error: (err) => this.handleError('Failed to update tab.', err),
      });
  }

  deleteTabFromModal(): void {
    if (!this.userId || !this.editingTabContext) {
      return;
    }

    const { sectionIndex, tabIndex } = this.editingTabContext;
    const section = this.sections[sectionIndex];
    const tabView = section?.tabs?.[tabIndex];

    if (!section || !tabView) {
      return;
    }

    const tabId = tabView.tab.id;
    this.error = null;

    this.tabsApi
      .deleteTab(this.userId, tabId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.runInZone(() => {
            this.closeEditTabModal();
            if (this.userId) {
              this.loadWorkspace(this.userId);
            }
          }),
        error: (err) => this.handleError('Failed to delete tab.', err),
      });
  }

  closeEditTabModal(): void {
    this.editTabForm = null;
    this.editingTabContext = null;
    this.removedEnvironmentIds.clear();
    this.originalEnvironmentMap.clear();
    this.environmentMenuState = null;
  }

  get environmentControls(): FormArray<FormGroup> {
    const controls = this.editTabForm?.get('environments') as FormArray<FormGroup> | undefined;
    return (controls ?? this.formBuilder.array([])) as unknown as FormArray<FormGroup>;
  }

  private loadEnvironmentCodes(): void {
    if (this.environmentCodes.length) {
      return;
    }

    this.constsApi
      .getEnvironmentCodes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (codes) => this.runInZone(() => (this.environmentCodes = codes)),
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
        this.runInZone(() => {
          if (!workspace) {
            return;
          }

          this.summary = workspace.summary;

          const visibleTabIds = new Set<string>();

          const sortedGroups = [...workspace.tabGroups].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

          this.sections = sortedGroups.map((group) => {
            const sortedTabs = [...group.tabs].sort((a, b) => {
              if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
              }
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });

            return {
              group: {
                id: group.id,
                title: group.title,
                sortOrder: group.sortOrder,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
              },
              tabs: sortedTabs.map((tab) => ({
                tab: {
                  id: tab.id,
                  title: tab.title,
                  sortOrder: tab.sortOrder,
                  createdAt: tab.createdAt,
                  updatedAt: tab.updatedAt,
                },
                environments: tab.environments,
                primaryEnvironment: this.getPrimaryEnvironment(tab.environments),
                faviconUrl: this.faviconErrorTabIds.has(tab.id)
                  ? null
                  : this.getFavicon(this.getPrimaryEnvironment(tab.environments)?.url ?? ''),
              })),
            };
          });

          this.sections.forEach((section) =>
            section.tabs.forEach((tabView) => visibleTabIds.add(tabView.tab.id)),
          );
          Array.from(this.faviconErrorTabIds).forEach((tabId) => {
            if (!visibleTabIds.has(tabId)) {
              this.faviconErrorTabIds.delete(tabId);
            }
          });

          this.loading = false;
          this.error = null;
          this.syncEditingGroupTabs();
        });
      });
  }

  private getPrimaryEnvironment(environments: Environment[]): Environment | undefined {
    const prd = environments.find((env) => env.name.toLowerCase() === 'prd');
    return prd ?? environments[0];
  }

  private syncEditingGroupTabs(): void {
    if (!this.editGroupForm || !this.editingGroupContext) {
      return;
    }

    const section = this.sections[this.editingGroupContext.sectionIndex];
    if (section) {
      this.editingGroupTabs = [...section.tabs];
    }
  }

  private reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
    if (fromIndex === toIndex) {
      return [...list];
    }

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  private handleError(message: string, err: unknown): void {
    console.error(message, err);
    this.runInZone(() => {
      this.error = message;
      this.loading = false;
      this.sections = [];
      this.faviconErrorTabIds.clear();
    });
  }


  private runInZone(callback: () => void): void {
    if (NgZone.isInAngularZone()) {
      callback();
    } else {
      this.ngZone.run(callback);
    }
  }
}
