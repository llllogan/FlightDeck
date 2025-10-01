import type { Request, Response } from 'express';
import type { CreateTabRequest, MoveTabRequest, RenameTabRequest } from '../../../models/requestBodies';
import type { serializeEnvironment, serializeTab } from '../../../serializers';

export type SerializedTab = ReturnType<typeof serializeTab>;
export type SerializedEnvironment = ReturnType<typeof serializeEnvironment>;

export type CreateRequest = Request<Record<string, never>, unknown, Partial<CreateTabRequest>>;
export type TabParams = { tabId: string };
export type RenameRequest = Request<TabParams, unknown, Partial<RenameTabRequest>>;
export type DeleteRequest = Request<TabParams>;
export type MoveRequest = Request<TabParams, unknown, Partial<MoveTabRequest>>;
export type TabResponse = Response<SerializedTab | { error: string }>;
