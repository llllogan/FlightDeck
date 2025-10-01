import type { Request, Response } from 'express';
import type { ParsedQs } from 'qs';
import type { TabSearchViewRow } from '../../../db/resourceAccess';

export interface TabSearchEnvironment {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TabSearchResult {
  tab: {
    id: string;
    title: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  tabGroup: {
    id: string;
    title: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  environments: TabSearchEnvironment[];
}

export type SearchTabsResponse = Response<TabSearchResult[] | { error: string }>;
export type SearchQuery = string | ParsedQs | (string | ParsedQs)[] | undefined;
export type TabSearchRows = TabSearchViewRow[];
export type SearchRequest = Request;
