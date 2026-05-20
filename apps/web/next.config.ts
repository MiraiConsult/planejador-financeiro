import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { NextConfig } from 'next';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  reactStrictMode: true,
  // monorepo: transpile o engine como TS direto
  transpilePackages: ['@planejador/engine'],
  // monorepo: aponta o tracing root pro repo (não pro home do usuário)
  outputFileTracingRoot: resolve(__dirname, '../..'),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
