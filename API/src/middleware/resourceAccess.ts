import type { NextFunction, Request, Response } from 'express';
import {
  getEnvironmentById,
  getTabById,
  getTabGroupById,
} from '../db/resourceAccess';

type IdSource = 'params' | 'body';

interface BaseAccessOptions {
  idSource?: IdSource;
  idKey?: string;
  missingMessage?: string;
  notFoundMessage?: string;
  forbiddenMessage?: string;
  failureMessage?: string;
}

function resolveId(req: Request, source: IdSource, key: string): string | null {
  const container = source === 'params' ? req.params : req.body ?? {};
  const value = (container as Record<string, unknown>)[key];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ensureUserContext(req: Request, res: Response): string | null {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return null;
  }

  return userId;
}

function handleFailure(res: Response, message: string, error: unknown): void {
  console.error(message, error);
  res.status(500).json({ error: message });
}

export function requireTabGroupAccess(options: BaseAccessOptions = {}) {
  const {
    idSource = 'params',
    idKey = 'tabGroupId',
    missingMessage =
      idSource === 'params'
        ? `${idKey} path parameter is required`
        : `${idKey} is required`,
    notFoundMessage = 'Tab group not found',
    forbiddenMessage = 'You do not have access to this tab group',
    failureMessage = 'Failed to load tab group',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = ensureUserContext(req, res);
    if (!userId) {
      return;
    }

    const tabGroupId = resolveId(req, idSource, idKey);

    if (!tabGroupId) {
      res.status(400).json({ error: missingMessage });
      return;
    }

    try {
      const tabGroup = await getTabGroupById(tabGroupId);

      if (!tabGroup) {
        res.status(404).json({ error: notFoundMessage });
        return;
      }

      if (tabGroup.userId !== userId) {
        res.status(403).json({ error: forbiddenMessage });
        return;
      }

      req.tabGroup = tabGroup;
      next();
    } catch (error) {
      handleFailure(res, failureMessage, error);
    }
  };
}

export function requireTabAccess(options: BaseAccessOptions = {}) {
  const {
    idSource = 'params',
    idKey = 'tabId',
    missingMessage =
      idSource === 'params' ? `${idKey} path parameter is required` : `${idKey} is required`,
    notFoundMessage = 'Tab not found',
    forbiddenMessage = 'You do not have access to this tab',
    failureMessage = 'Failed to load tab',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = ensureUserContext(req, res);
    if (!userId) {
      return;
    }

    const tabId = resolveId(req, idSource, idKey);

    if (!tabId) {
      res.status(400).json({ error: missingMessage });
      return;
    }

    try {
      const tab = await getTabById(tabId);

      if (!tab) {
        res.status(404).json({ error: notFoundMessage });
        return;
      }

      if (tab.userId !== userId) {
        res.status(403).json({ error: forbiddenMessage });
        return;
      }

      req.tab = tab;
      next();
    } catch (error) {
      handleFailure(res, failureMessage, error);
    }
  };
}

export function requireEnvironmentAccess(options: BaseAccessOptions = {}) {
  const {
    idSource = 'params',
    idKey = 'environmentId',
    missingMessage =
      idSource === 'params'
        ? `${idKey} path parameter is required`
        : `${idKey} is required`,
    notFoundMessage = 'Environment not found',
    forbiddenMessage = 'You do not have access to this environment',
    failureMessage = 'Failed to load environment',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = ensureUserContext(req, res);
    if (!userId) {
      return;
    }

    const environmentId = resolveId(req, idSource, idKey);

    if (!environmentId) {
      res.status(400).json({ error: missingMessage });
      return;
    }

    try {
      const environment = await getEnvironmentById(environmentId);

      if (!environment) {
        res.status(404).json({ error: notFoundMessage });
        return;
      }

      if (environment.userId !== userId) {
        res.status(403).json({ error: forbiddenMessage });
        return;
      }

      req.environment = environment;
      next();
    } catch (error) {
      handleFailure(res, failureMessage, error);
    }
  };
}
