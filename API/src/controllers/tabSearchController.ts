import { Request, Response } from 'express';
import type { ParsedQs } from 'qs';
import { searchTabsForUser, type TabSearchViewRow } from '../db/resourceAccess';

interface TabSearchEnvironment {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TabSearchResult {
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

type SearchTabsResponse = Response<TabSearchResult[] | { error: string }>;

type SearchQuery = string | ParsedQs | (string | ParsedQs)[] | undefined;

function buildSearchResults(rows: TabSearchViewRow[]): TabSearchResult[] {
  const results = new Map<string, TabSearchResult>();

  for (const row of rows) {
    let entry = results.get(row.tabId);

    if (!entry) {
      entry = {
        tab: {
          id: row.tabId,
          title: row.tabTitle,
          sortOrder: row.tabSortOrder,
          createdAt: row.tabCreatedAt,
          updatedAt: row.tabUpdatedAt,
        },
        tabGroup: {
          id: row.tabGroupId,
          title: row.tabGroupTitle,
          sortOrder: row.tabGroupSortOrder,
          createdAt: row.tabGroupCreatedAt,
          updatedAt: row.tabGroupUpdatedAt,
        },
        environments: [],
      };

      results.set(row.tabId, entry);
    }

    if (row.environmentId) {
      const alreadyIncluded = entry.environments.some((env) => env.id === row.environmentId);
      if (!alreadyIncluded) {
        entry.environments.push({
          id: row.environmentId,
          name: row.environmentName ?? '',
          url: row.environmentUrl ?? '',
          createdAt: row.environmentCreatedAt ?? row.tabCreatedAt,
          updatedAt: row.environmentUpdatedAt ?? row.tabUpdatedAt,
        });
      }
    }
  }

  return Array.from(results.values());
}

function normalizeQuery(query: SearchQuery): string {
  if (Array.isArray(query)) {
    return normalizeQuery(query[0]);
  }

  if (typeof query === 'object' && query !== null) {
    return '';
  }

  return query ?? '';
}

async function searchTabs(req: Request, res: SearchTabsResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  const queryParam = normalizeQuery(req.query.q);
  const sanitizedTerm = queryParam.trim();

  if (!sanitizedTerm) {
    res.json([]);
    return;
  }

  try {
    const rows = await searchTabsForUser(userId, sanitizedTerm);
    const results = buildSearchResults(rows);
    res.json(results);
  } catch (error) {
    console.error('Failed to search tabs', error);
    res.status(500).json({ error: 'Failed to search tabs' });
  }
}

export { searchTabs };
