import { applyRuntimeOverrides, type EnvironmentConfig } from './environment.runtime';

const baseEnvironment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api.example.com',
  version: '0.0.1',
};

export const environment = applyRuntimeOverrides(baseEnvironment);
