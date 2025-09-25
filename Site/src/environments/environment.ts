import { applyRuntimeOverrides, type EnvironmentConfig } from './environment.runtime';

const baseEnvironment: EnvironmentConfig = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
};

export const environment = applyRuntimeOverrides(baseEnvironment);
