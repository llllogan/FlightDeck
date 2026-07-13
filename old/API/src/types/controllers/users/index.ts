import type { Request, Response } from 'express';
import type { CreateUserRequest, UpdateUserRequest } from '../../../models/requestBodies';
import type {
  serializeEnvironment,
  serializeTab,
  serializeTabGroup,
  serializeUser,
  serializeUserSummary,
} from '../../../serializers';

export type CreateUserRequestHandler = Request<Record<string, never>, unknown, Partial<CreateUserRequest>>;
export type UpdateUserRequestHandler = Request<
  { userId: string },
  Record<string, never>,
  Partial<UpdateUserRequest>
>;

export type EmptyRequest = Request;

export type SerializedUserSummary = ReturnType<typeof serializeUserSummary>;
export type SerializedTabGroup = ReturnType<typeof serializeTabGroup>;
export type SerializedTab = ReturnType<typeof serializeTab>;
export type SerializedEnvironment = ReturnType<typeof serializeEnvironment>;
export type SerializedUser = ReturnType<typeof serializeUser>;

export type WorkspaceTab = SerializedTab & { environments: SerializedEnvironment[] };
export type WorkspaceTabGroup = SerializedTabGroup & { tabs: WorkspaceTab[] };

export interface WorkspacePayload {
  summary: SerializedUserSummary | null;
  tabGroups: WorkspaceTabGroup[];
}

export type WorkspaceResponse = Response<WorkspacePayload | { error: string }>;
export type SummaryResponse = Response<SerializedUserSummary | { error: string }>;
export type TabGroupsResponse = Response<SerializedTabGroup[] | { error: string }>;
export type StandardResponse = Response<SerializedUser | Record<string, unknown>>;
export type UsersResponse = Response<SerializedUser[] | { error: string }>;
