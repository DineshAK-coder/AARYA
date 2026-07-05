import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  dts: false,
  outDir: 'dist',
  clean: true,
  noExternal: [
    'ai',
    '@ai-sdk/google',
    '@ai-sdk/provider',
    '@ai-sdk/provider-utils',
    'fuse.js',
    'zod',
    '@google/generative-ai',
    '@supabase/supabase-js',
  ],
});
