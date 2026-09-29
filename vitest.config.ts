import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // jsdom: un "browser finto" (localStorage, window, eventi) per provare il codice del frontend.
    environment: 'jsdom',
    env: { VITE_API_URL: 'https://api.esempio.test' },
  },
});
