import { applyRuntimeOverrides, type EnvironmentConfig } from './environment.runtime';

const baseEnvironment: EnvironmentConfig = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  version: '0.0.4t',
};

export const environment = applyRuntimeOverrides(baseEnvironment);
