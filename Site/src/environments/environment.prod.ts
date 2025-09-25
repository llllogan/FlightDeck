import { applyRuntimeOverrides, type EnvironmentConfig } from './environment.runtime';

const baseEnvironment: EnvironmentConfig = {
  production: true,
  apiBaseUrl: 'https://api.example.com',
};

export const environment = applyRuntimeOverrides(baseEnvironment);
