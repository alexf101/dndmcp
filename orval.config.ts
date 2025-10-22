import type { defineConfig } from 'orval';

const config: ReturnType<typeof defineConfig> = {

  api: {
    input: './backend/openapi-full.json',
    output: {
      target: './frontend/src/api/generated.ts',
      client: 'fetch',
      mode: 'tags-split',
      baseUrl: 'http://localhost:8000',
      override: {
        mutator: {
          path: './frontend/src/api/fetcher.ts',
          name: 'customFetch',
        },
      },
    },
  },
};

export default config;
