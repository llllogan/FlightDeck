import type { Request, Response } from 'express';
import { searchTabsForUser } from '../db/resourceAccess';
import { sanitizeTextInput } from '../utils/sanitizers';
import type {
  SearchQuery,
  SearchTabsResponse,
  TabSearchResult,
  TabSearchRows,
} from '../types/controllers/tabSearch';

function buildSearchResults(rows: TabSearchRows): TabSearchResult[] {
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
  const userId = req.userId;

  if (!userId) {
    res.status(500).json({ error: 'User context not initialized' });
    return;
  }

  const queryParam = normalizeQuery(req.query.q);
  const sanitizedTerm = sanitizeTextInput(queryParam);

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
