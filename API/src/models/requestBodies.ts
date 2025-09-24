export interface CreateUserRequest {
  name: string;
}

export interface CreateTabGroupRequest {
  title: string;
}

export interface RenameTabGroupRequest {
  title: string;
}

export type MoveDirection = 'up' | 'down';

export interface MoveTabGroupRequest {
  direction: MoveDirection;
}

export interface CreateTabRequest {
  tabGroupId: string;
  title: string;
  environment: {
    name: string;
    url: string;
  };
}

export interface RenameTabRequest {
  title: string;
}

export interface MoveTabRequest {
  direction: MoveDirection;
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
