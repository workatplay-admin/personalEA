// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
  console.log('Setting up contract tests...');
  
  // Wait for services to be ready (when testing against real services)
  if (process.env.WAIT_FOR_SERVICES === 'true') {
    await waitForServices();
  }
});

afterAll(async () => {
  // Cleanup code that runs after all tests
  console.log('Cleaning up contract tests...');
});

// Helper function to wait for services to be ready
async function waitForServices(): Promise<void> {
  const services = [
    { name: 'Email Service', url: process.env.EMAIL_SERVICE_URL },
    { name: 'Goals Service', url: process.env.GOALS_SERVICE_URL },
    { name: 'Calendar Service', url: process.env.CALENDAR_SERVICE_URL }
  ];

  const maxRetries = 30;
  const retryDelay = 1000;

  for (const service of services) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${service.url}/v1/health`);
        if (response.ok) {
          console.log(`✅ ${service.name} is ready`);
          break;
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`❌ ${service.name} failed to start after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}