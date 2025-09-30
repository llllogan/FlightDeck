type EnvironmentConfig = {
  production: boolean;
  apiBaseUrl: string;
  version: string;
};

declare global {
  interface Window {
    __env?: Partial<EnvironmentConfig>;
  }
}

function applyRuntimeOverrides(baseConfig: EnvironmentConfig): EnvironmentConfig {
  if (typeof window === 'undefined') {
    return baseConfig;
  }

  const overrides = window.__env ?? {};
  return { ...baseConfig, ...overrides };
}

export { applyRuntimeOverrides };
export type { EnvironmentConfig };
