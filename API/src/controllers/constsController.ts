import { Request, Response } from 'express';

export const ENVIRONMENT_CODES = ['prd', 'ci', 'qa', 'tst', 'dev', 'local'] as const;
export type EnvironmentCode = (typeof ENVIRONMENT_CODES)[number];

export function getEnvironments(_req: Request, res: Response): void {
  res.json({ environments: ENVIRONMENT_CODES });
}
