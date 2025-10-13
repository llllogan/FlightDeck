import type { Request, Response } from 'express';
import type {
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '../../../models/requestBodies';
import type { serializeEnvironment } from '../../../serializers';

export type SerializedEnvironment = ReturnType<typeof serializeEnvironment>;
export type TabEnvironmentsResponse = Response<SerializedEnvironment[] | { error: string }>;
export type TabEnvironmentRequest = Request<{ tabId: string }>;
export type CreateRequest = Request<Record<string, never>, unknown, Partial<CreateEnvironmentRequest>>;
export type EnvironmentParams = { environmentId: string };
export type UpdateRequest = Request<EnvironmentParams, unknown, Partial<UpdateEnvironmentRequest>>;
export type DeleteRequest = Request<EnvironmentParams>;
