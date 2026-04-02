import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://sugarforever.github.io',
  base: '/understanding-fantastic-coding-agents',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
