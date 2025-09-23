export interface ApiUser {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  tabGroupCount: number;
  tabCount: number;
  environmentCount: number;
}

export interface TabGroup {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface TabGroupSummary {
  id: string;
  title: string;
  tabCount: number;
  environmentCount: number;
}

export interface Tab {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
}

export interface CreateTabGroupPayload {
  title: string;
}

export interface RenameTabGroupPayload {
  title: string;
}

export interface CreateEnvironmentPayload {
  name: string;
  url: string;
}

export interface UpdateEnvironmentPayload {
  name: string;
  url: string;
}

export interface CreateEnvironmentRequest extends CreateEnvironmentPayload {
  tabId: string;
}

export interface CreateTabPayload {
  tabGroupId: string;
  title: string;
  environment: CreateEnvironmentPayload;
}

export interface RenameTabPayload {
  title: string;
}

export interface EnvironmentCodesResponse {
  environments: string[];
}

export interface HealthResponse {
  status: string;
  database?: string;
}
