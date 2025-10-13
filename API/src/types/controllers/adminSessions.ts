import type { Request, Response } from 'express';
import type { serializeAdminSession } from '../../serializers';

export interface DeleteSessionParams {
  sessionId: string;
}

export type SerializedAdminSession = ReturnType<typeof serializeAdminSession>;

export type AdminSessionsResponse = Response<SerializedAdminSession[] | { error: string }>;
export type DeleteSessionResponse = Response<Record<string, never> | { error: string }>;
export type DeleteSessionRequest = Request<DeleteSessionParams>;
