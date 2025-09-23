export interface CreateUserRequest {
  name: string;
}

export interface CreateTabGroupRequest {
  title: string;
}

export interface RenameTabGroupRequest {
  title: string;
}

export interface CreateTabRequest {
  tabGroupId: string;
  title: string;
}

export interface RenameTabRequest {
  title: string;
}

export interface CreateEnvironmentRequest {
  tabId: string;
  name: string;
  url: string;
}

export interface UpdateEnvironmentRequest {
  name: string;
  url: string;
}
