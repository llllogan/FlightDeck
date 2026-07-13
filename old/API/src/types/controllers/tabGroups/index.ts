import type { Request, Response } from 'express';
import type {
  CreateTabGroupRequest,
  MoveTabGroupRequest,
  RenameTabGroupRequest,
} from '../../../models/requestBodies';
import type {
  serializeTab,
  serializeTabGroup,
  serializeTabGroupSummary,
} from '../../../serializers';

export type SerializedTabGroup = ReturnType<typeof serializeTabGroup>;
export type SerializedTabGroupSummary = ReturnType<typeof serializeTabGroupSummary>;
export type SerializedTab = ReturnType<typeof serializeTab>;

export type ListResponse = Response<SerializedTabGroup[] | { error: string }>;
export type SummaryResponse = Response<SerializedTabGroupSummary[] | { error: string }>;
export type TabsByGroupResponse = Response<SerializedTab[] | { error: string }>;

export type CreateRequest = Request<Record<string, never>, unknown, Partial<CreateTabGroupRequest>>;
export type RenameParams = { tabGroupId: string };
export type RenameRequest = Request<RenameParams, unknown, Partial<RenameTabGroupRequest>>;
export type DeleteRequest = Request<RenameParams>;
export type MoveRequest = Request<RenameParams, unknown, Partial<MoveTabGroupRequest>>;
export type TabsRequestParams = { tabGroupId: string };
export type TabsRequest = Request<TabsRequestParams>;
