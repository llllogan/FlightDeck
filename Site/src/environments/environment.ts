import { applyRuntimeOverrides, type EnvironmentConfig } from './environment.runtime';

const baseEnvironment: EnvironmentConfig = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
};

export const environment = applyRuntimeOverrides(baseEnvironment);
