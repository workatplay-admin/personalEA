import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Playwright Global Teardown completed');
}

export default globalTeardown;