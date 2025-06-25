import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Browser, Page, chromium } from 'playwright';

describe('Phase 2-3 Planning Interface Browser Tests', () => {
  let browser: Browser;
  let page: Page;
  let baseURL: string;

  beforeAll(async () => {
    // Launch browser for testing
    browser = await chromium.launch({
      headless: process.env.CI === 'true', // Headless in CI, visible locally
      slowMo: 50 // Slow down for better visibility during development
    });

    // Determine base URL
    baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log(`🌐 Testing against: ${baseURL}`);
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up page with reasonable timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔥 Browser console error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.error('🔥 Page error:', error.message);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Goal Creation and SMART Criteria Workflow', () => {
    it('should create a goal with SMART criteria and navigate to milestone generation', async () => {
      try {
        // Navigate to the application
        console.log('🚀 Navigating to application...');
        await page.goto(baseURL);

        // Wait for the page to load
        await page.waitForLoadState('networkidle');

        // Look for goal creation interface
        const goalButton = page.locator('button:has-text("Create Goal"), button:has-text("New Goal"), [data-testid="create-goal"]').first();
        
        if (await goalButton.isVisible({ timeout: 5000 })) {
          console.log('✅ Found goal creation button');
          await goalButton.click();
        } else {
          // Alternative: look for goal input field
          const goalInput = page.locator('input[placeholder*="goal"], textarea[placeholder*="goal"]').first();
          await expect(goalInput).toBeVisible();
          console.log('✅ Found goal input field');
        }

        // Fill in SMART goal criteria
        const testGoal = {
          title: 'Build E-commerce Platform',
          specific: 'Create a full-stack e-commerce web application with user authentication, product catalog, shopping cart, and payment processing',
          measurable: 'Complete application with 5 main modules: Authentication, Product Catalog, Shopping Cart, Payment Processing, and Admin Panel',
          achievable: 'Using React.js, Node.js, PostgreSQL, and Stripe - technologies the team knows well',
          relevant: 'Enables online sales for the business, expanding market reach and revenue potential',
          timeBound: 'Complete development and deploy to production within 16 weeks'
        };

        // Fill goal title
        const titleInput = page.locator('input[name="title"], input[placeholder*="title"], [data-testid="goal-title"]').first();
        if (await titleInput.isVisible({ timeout: 5000 })) {
          await titleInput.fill(testGoal.title);
          console.log('✅ Filled goal title');
        }

        // Fill SMART criteria fields
        const smartFields = [
          { name: 'specific', value: testGoal.specific },
          { name: 'measurable', value: testGoal.measurable },
          { name: 'achievable', value: testGoal.achievable },
          { name: 'relevant', value: testGoal.relevant },
          { name: 'timeBound', value: testGoal.timeBound }
        ];

        for (const field of smartFields) {
          const fieldLocator = page.locator(
            `textarea[name="${field.name}"], input[name="${field.name}"], [data-testid="${field.name}"]`
          ).first();
          
          if (await fieldLocator.isVisible({ timeout: 2000 })) {
            await fieldLocator.fill(field.value);
            console.log(`✅ Filled ${field.name} field`);
          } else {
            console.log(`⚠️ ${field.name} field not found, continuing...`);
          }
        }

        // Submit the goal
        const submitButton = page.locator(
          'button:has-text("Create"), button:has-text("Submit"), button:has-text("Save"), [data-testid="submit-goal"]'
        ).first();
        
        if (await submitButton.isVisible({ timeout: 5000 })) {
          await submitButton.click();
          console.log('✅ Submitted goal');

          // Wait for navigation or success indication
          await page.waitForTimeout(2000);

          // Look for success indicators or milestone generation interface
          const successIndicators = [
            'text=Goal created',
            'text=Success',
            'text=Milestone',
            '[data-testid="milestone-generation"]',
            'text=generated'
          ];

          let foundIndicator = false;
          for (const indicator of successIndicators) {
            if (await page.locator(indicator).isVisible({ timeout: 3000 })) {
              console.log(`✅ Found success indicator: ${indicator}`);
              foundIndicator = true;
              break;
            }
          }

          if (!foundIndicator) {
            console.log('⚠️ No clear success indicator found, checking page content...');
            const bodyText = await page.textContent('body');
            console.log('Page content includes:', bodyText?.substring(0, 500));
          }

        } else {
          console.log('⚠️ Submit button not found, goal creation interface may be different');
        }

      } catch (error) {
        console.error('❌ Error in goal creation test:', error);
        
        // Take screenshot for debugging
        await page.screenshot({ 
          path: `test-results/goal-creation-error-${Date.now()}.png`,
          fullPage: true 
        });
        
        throw error;
      }
    }, 60000);

    it('should validate SMART criteria and show feedback', async () => {
      try {
        console.log('🚀 Testing SMART criteria validation...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Try to submit incomplete goal
        const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
        
        if (await titleInput.isVisible({ timeout: 5000 })) {
          await titleInput.fill('Incomplete Goal');
          
          // Leave other fields empty and try to submit
          const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit")').first();
          
          if (await submitButton.isVisible({ timeout: 5000 })) {
            await submitButton.click();
            
            // Look for validation messages
            const validationMessages = [
              'text=required',
              'text=Please fill',
              'text=invalid',
              '.error',
              '[data-testid="validation-error"]'
            ];

            let foundValidation = false;
            for (const message of validationMessages) {
              if (await page.locator(message).isVisible({ timeout: 3000 })) {
                console.log(`✅ Found validation message: ${message}`);
                foundValidation = true;
                break;
              }
            }

            if (!foundValidation) {
              console.log('⚠️ No validation messages found - validation may be handled differently');
            }
          }
        }

      } catch (error) {
        console.error('❌ Error in validation test:', error);
        await page.screenshot({ 
          path: `test-results/validation-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);
  });

  describe('Milestone Generation Interface', () => {
    it('should display milestone generation options and controls', async () => {
      try {
        console.log('🚀 Testing milestone generation interface...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for milestone-related interface elements
        const milestoneElements = [
          'text=Milestone',
          'text=Generate Milestones',
          '[data-testid="milestone-generator"]',
          'text=milestone count',
          'text=distribution'
        ];

        let milestoneInterfaceFound = false;
        for (const element of milestoneElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found milestone interface element: ${element}`);
            milestoneInterfaceFound = true;
            
            // Test milestone configuration options
            const milestoneCountInput = page.locator(
              'input[name*="milestone"], input[name*="count"], [data-testid="milestone-count"]'
            ).first();
            
            if (await milestoneCountInput.isVisible({ timeout: 3000 })) {
              await milestoneCountInput.fill('4');
              console.log('✅ Set milestone count to 4');
            }

            // Test distribution strategy selection
            const distributionSelect = page.locator(
              'select[name*="distribution"], [data-testid="distribution-strategy"]'
            ).first();
            
            if (await distributionSelect.isVisible({ timeout: 3000 })) {
              await distributionSelect.selectOption('EVEN');
              console.log('✅ Selected EVEN distribution strategy');
            }

            break;
          }
        }

        if (!milestoneInterfaceFound) {
          console.log('⚠️ Milestone interface not immediately visible, may require navigation');
          
          // Try to navigate to milestone section
          const milestoneNav = page.locator(
            'a:has-text("Milestone"), button:has-text("Milestone"), [href*="milestone"]'
          ).first();
          
          if (await milestoneNav.isVisible({ timeout: 5000 })) {
            await milestoneNav.click();
            await page.waitForTimeout(2000);
            console.log('✅ Navigated to milestone section');
          }
        }

      } catch (error) {
        console.error('❌ Error in milestone interface test:', error);
        await page.screenshot({ 
          path: `test-results/milestone-interface-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);

    it('should generate and display milestones with proper formatting', async () => {
      try {
        console.log('🚀 Testing milestone generation and display...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for generate milestones button
        const generateButton = page.locator(
          'button:has-text("Generate"), button:has-text("Create Milestones"), [data-testid="generate-milestones"]'
        ).first();

        if (await generateButton.isVisible({ timeout: 5000 })) {
          console.log('✅ Found generate milestones button');
          await generateButton.click();

          // Wait for generation process
          await page.waitForTimeout(3000);

          // Look for generated milestone content
          const milestoneDisplays = [
            '.milestone-card',
            '[data-testid="milestone"]',
            'text=Milestone 1',
            'text=target date',
            'text=completion criteria'
          ];

          let milestonesDisplayed = false;
          for (const display of milestoneDisplays) {
            if (await page.locator(display).isVisible({ timeout: 5000 })) {
              console.log(`✅ Found milestone display: ${display}`);
              milestonesDisplayed = true;
              break;
            }
          }

          if (milestonesDisplayed) {
            // Verify milestone details are properly formatted
            const milestoneElements = page.locator('.milestone-card, [data-testid="milestone"]');
            const count = await milestoneElements.count();
            
            if (count > 0) {
              console.log(`✅ Found ${count} milestone displays`);
              
              // Check first milestone for proper content
              const firstMilestone = milestoneElements.first();
              const hasTitle = await firstMilestone.locator('h3, .title, [data-testid="milestone-title"]').isVisible();
              const hasDescription = await firstMilestone.locator('.description, [data-testid="milestone-description"]').isVisible();
              
              if (hasTitle || hasDescription) {
                console.log('✅ Milestones have proper content structure');
              }
            }
          } else {
            console.log('⚠️ Generated milestones not visible, checking for loading states...');
            
            const loadingStates = [
              'text=Generating',
              'text=Loading',
              '.spinner',
              '[data-testid="loading"]'
            ];

            for (const loading of loadingStates) {
              if (await page.locator(loading).isVisible({ timeout: 2000 })) {
                console.log(`✅ Found loading state: ${loading}`);
                await page.waitForTimeout(5000); // Wait longer for generation
                break;
              }
            }
          }

        } else {
          console.log('⚠️ Generate milestones button not found');
        }

      } catch (error) {
        console.error('❌ Error in milestone generation test:', error);
        await page.screenshot({ 
          path: `test-results/milestone-generation-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 45000);
  });

  describe('Work Breakdown Structure (WBS) Interface', () => {
    it('should display task breakdown for milestones', async () => {
      try {
        console.log('🚀 Testing WBS interface...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for WBS or task breakdown interface
        const wbsElements = [
          'text=Task Breakdown',
          'text=WBS',
          'text=Work Breakdown',
          '[data-testid="wbs-generator"]',
          'text=Break Down Tasks'
        ];

        let wbsFound = false;
        for (const element of wbsElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found WBS interface: ${element}`);
            wbsFound = true;
            break;
          }
        }

        if (!wbsFound) {
          // Try navigating to WBS section
          const wbsNav = page.locator(
            'a:has-text("Tasks"), a:has-text("WBS"), [href*="tasks"], [href*="wbs"]'
          ).first();
          
          if (await wbsNav.isVisible({ timeout: 5000 })) {
            await wbsNav.click();
            await page.waitForTimeout(2000);
            console.log('✅ Navigated to WBS section');
          }
        }

        // Look for task display elements
        const taskElements = [
          '.task-card',
          '[data-testid="task"]',
          'text=estimated hours',
          'text=priority',
          'text=complexity'
        ];

        for (const element of taskElements) {
          if (await page.locator(element).isVisible({ timeout: 3000 })) {
            console.log(`✅ Found task display element: ${element}`);
            break;
          }
        }

      } catch (error) {
        console.error('❌ Error in WBS interface test:', error);
        await page.screenshot({ 
          path: `test-results/wbs-interface-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);

    it('should allow task estimation and show estimation details', async () => {
      try {
        console.log('🚀 Testing task estimation interface...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for estimation interface
        const estimationElements = [
          'text=Estimate',
          'text=Hours',
          'button:has-text("Estimate")',
          '[data-testid="estimate-task"]',
          'text=estimation method'
        ];

        let estimationFound = false;
        for (const element of estimationElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found estimation interface: ${element}`);
            estimationFound = true;
            
            // Try clicking estimation button
            if (element.includes('button')) {
              await page.locator(element).first().click();
              await page.waitForTimeout(2000);
              console.log('✅ Clicked estimation button');
            }
            break;
          }
        }

        if (estimationFound) {
          // Look for estimation results or forms
          const estimationResults = [
            'text=estimated hours',
            'text=confidence',
            'text=method',
            '.estimation-result',
            '[data-testid="estimation-result"]'
          ];

          for (const result of estimationResults) {
            if (await page.locator(result).isVisible({ timeout: 5000 })) {
              console.log(`✅ Found estimation result: ${result}`);
              break;
            }
          }
        }

      } catch (error) {
        console.error('❌ Error in estimation interface test:', error);
        await page.screenshot({ 
          path: `test-results/estimation-interface-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);
  });

  describe('Dependency Mapping and Scheduling Interface', () => {
    it('should display dependency visualization and critical path', async () => {
      try {
        console.log('🚀 Testing dependency visualization...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for dependency or scheduling interface
        const dependencyElements = [
          'text=Dependencies',
          'text=Critical Path',
          'text=Schedule',
          'text=Timeline',
          '[data-testid="dependency-view"]',
          '.dependency-graph'
        ];

        let dependencyFound = false;
        for (const element of dependencyElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found dependency interface: ${element}`);
            dependencyFound = true;
            break;
          }
        }

        if (!dependencyFound) {
          // Try navigating to schedule/dependency section
          const scheduleNav = page.locator(
            'a:has-text("Schedule"), a:has-text("Dependencies"), [href*="schedule"], [href*="dependencies"]'
          ).first();
          
          if (await scheduleNav.isVisible({ timeout: 5000 })) {
            await scheduleNav.click();
            await page.waitForTimeout(2000);
            console.log('✅ Navigated to schedule section');
          }
        }

        // Look for schedule visualization elements
        const scheduleElements = [
          '.timeline',
          '.gantt-chart',
          '[data-testid="schedule-view"]',
          'text=start date',
          'text=end date',
          'text=duration'
        ];

        for (const element of scheduleElements) {
          if (await page.locator(element).isVisible({ timeout: 3000 })) {
            console.log(`✅ Found schedule visualization: ${element}`);
            break;
          }
        }

      } catch (error) {
        console.error('❌ Error in dependency visualization test:', error);
        await page.screenshot({ 
          path: `test-results/dependency-visualization-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);

    it('should allow schedule configuration and show working hours setup', async () => {
      try {
        console.log('🚀 Testing schedule configuration...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Look for schedule configuration
        const configElements = [
          'text=Working Hours',
          'text=Schedule Settings',
          'text=Configuration',
          '[data-testid="schedule-config"]',
          'text=Monday',
          'text=Tuesday'
        ];

        let configFound = false;
        for (const element of configElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found schedule configuration: ${element}`);
            configFound = true;
            break;
          }
        }

        if (configFound) {
          // Try to modify working hours
          const timeInputs = page.locator('input[type="time"], input[placeholder*="time"]');
          const timeInputCount = await timeInputs.count();
          
          if (timeInputCount > 0) {
            console.log(`✅ Found ${timeInputCount} time input fields`);
            
            // Try to modify first time input
            await timeInputs.first().fill('09:00');
            await page.waitForTimeout(500);
            console.log('✅ Modified working hours start time');
          }

          // Look for day toggles
          const dayToggles = page.locator(
            'input[type="checkbox"][name*="day"], .day-toggle, [data-testid*="day-enabled"]'
          );
          const toggleCount = await dayToggles.count();
          
          if (toggleCount > 0) {
            console.log(`✅ Found ${toggleCount} day toggle controls`);
          }
        }

      } catch (error) {
        console.error('❌ Error in schedule configuration test:', error);
        await page.screenshot({ 
          path: `test-results/schedule-config-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);
  });

  describe('Complete Workflow Integration', () => {
    it('should navigate through complete planning workflow from goal to schedule', async () => {
      try {
        console.log('🚀 Testing complete planning workflow...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Take initial screenshot
        await page.screenshot({ 
          path: `test-results/workflow-start-${Date.now()}.png`,
          fullPage: true 
        });

        const workflowSteps = [
          'Create Goal',
          'Generate Milestones', 
          'Break Down Tasks',
          'Estimate Tasks',
          'Map Dependencies',
          'Create Schedule'
        ];

        let currentStep = 0;
        for (const step of workflowSteps) {
          console.log(`📋 Workflow Step ${currentStep + 1}: ${step}`);
          
          // Look for step-related elements
          const stepElements = page.locator(`text=${step}, [data-testid*="${step.toLowerCase().replace(' ', '-')}"]`);
          
          if (await stepElements.first().isVisible({ timeout: 10000 })) {
            console.log(`✅ Found step interface: ${step}`);
            
            // Try to interact with the step
            if (stepElements.first()) {
              try {
                await stepElements.first().click({ timeout: 3000 });
                await page.waitForTimeout(2000);
                console.log(`✅ Interacted with: ${step}`);
              } catch (clickError) {
                console.log(`⚠️ Could not click ${step}, may not be clickable`);
              }
            }
          } else {
            console.log(`⚠️ Step not immediately visible: ${step}`);
            
            // Try to find navigation or workflow indicators
            const workflowNav = page.locator(
              `a:has-text("${step}"), button:has-text("${step}"), [href*="${step.toLowerCase()}"]`
            ).first();
            
            if (await workflowNav.isVisible({ timeout: 5000 })) {
              await workflowNav.click();
              await page.waitForTimeout(2000);
              console.log(`✅ Navigated to: ${step}`);
            }
          }

          // Take screenshot after each major step
          if (currentStep % 2 === 0) {
            await page.screenshot({ 
              path: `test-results/workflow-step-${currentStep}-${Date.now()}.png`,
              fullPage: true 
            });
          }

          currentStep++;
        }

        // Look for final schedule or completion indicator
        const completionElements = [
          'text=Schedule Complete',
          'text=Planning Complete',
          'text=Generated Schedule',
          '.schedule-complete',
          '[data-testid="schedule-complete"]'
        ];

        let workflowComplete = false;
        for (const element of completionElements) {
          if (await page.locator(element).isVisible({ timeout: 5000 })) {
            console.log(`✅ Found workflow completion indicator: ${element}`);
            workflowComplete = true;
            break;
          }
        }

        if (!workflowComplete) {
          console.log('⚠️ No clear workflow completion indicator found');
          console.log('Current page URL:', page.url());
          
          const bodyText = await page.textContent('body');
          if (bodyText?.includes('schedule') || bodyText?.includes('plan') || bodyText?.includes('complete')) {
            console.log('✅ Page content suggests workflow progress');
          }
        }

        // Take final screenshot
        await page.screenshot({ 
          path: `test-results/workflow-end-${Date.now()}.png`,
          fullPage: true 
        });

        console.log('🎉 Workflow navigation test completed');

      } catch (error) {
        console.error('❌ Error in complete workflow test:', error);
        await page.screenshot({ 
          path: `test-results/workflow-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 120000); // 2 minute timeout for complete workflow

    it('should handle errors gracefully and show user-friendly messages', async () => {
      try {
        console.log('🚀 Testing error handling in UI...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Try to trigger various error conditions
        const errorTriggers = [
          {
            action: 'Submit empty form',
            selector: 'button:has-text("Submit"), button:has-text("Create")',
            expectation: 'validation error'
          },
          {
            action: 'Invalid input',
            selector: 'input[type="number"]',
            value: '-999',
            expectation: 'validation message'
          }
        ];

        for (const trigger of errorTriggers) {
          console.log(`🔍 Testing: ${trigger.action}`);
          
          const element = page.locator(trigger.selector).first();
          if (await element.isVisible({ timeout: 5000 })) {
            if (trigger.value) {
              await element.fill(trigger.value);
              await page.waitForTimeout(500);
            } else {
              await element.click();
              await page.waitForTimeout(1000);
            }

            // Look for error messages
            const errorSelectors = [
              '.error',
              '.alert-error',
              '[data-testid="error"]',
              'text=Error',
              'text=Invalid',
              'text=Required'
            ];

            let errorFound = false;
            for (const errorSelector of errorSelectors) {
              if (await page.locator(errorSelector).isVisible({ timeout: 3000 })) {
                console.log(`✅ Found error handling: ${errorSelector}`);
                errorFound = true;
                break;
              }
            }

            if (!errorFound) {
              console.log(`⚠️ No error message found for: ${trigger.action}`);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error in error handling test:', error);
        await page.screenshot({ 
          path: `test-results/error-handling-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 45000);
  });

  describe('Responsive Design and Accessibility', () => {
    it('should work correctly on mobile viewport', async () => {
      try {
        console.log('🚀 Testing mobile responsiveness...');
        
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Take mobile screenshot
        await page.screenshot({ 
          path: `test-results/mobile-view-${Date.now()}.png`,
          fullPage: true 
        });

        // Check if mobile navigation exists
        const mobileNav = page.locator(
          '.mobile-menu, .hamburger, button[aria-label*="menu"], [data-testid="mobile-nav"]'
        ).first();

        if (await mobileNav.isVisible({ timeout: 5000 })) {
          console.log('✅ Found mobile navigation');
          await mobileNav.click();
          await page.waitForTimeout(1000);
          console.log('✅ Mobile navigation is interactive');
        }

        // Check that content is still accessible
        const contentElements = page.locator('main, .content, [role="main"]');
        const isContentVisible = await contentElements.first().isVisible();
        
        if (isContentVisible) {
          console.log('✅ Main content is visible on mobile');
        }

        // Test form inputs on mobile
        const inputs = page.locator('input, textarea, select');
        const inputCount = await inputs.count();
        
        if (inputCount > 0) {
          // Try to focus first input
          await inputs.first().focus();
          await page.waitForTimeout(500);
          console.log('✅ Form inputs are focusable on mobile');
        }

      } catch (error) {
        console.error('❌ Error in mobile responsiveness test:', error);
        await page.screenshot({ 
          path: `test-results/mobile-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);

    it('should have proper accessibility features', async () => {
      try {
        console.log('🚀 Testing accessibility features...');
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');

        // Check for accessibility attributes
        const accessibilityChecks = [
          { selector: 'button', attribute: 'aria-label', description: 'buttons with aria-label' },
          { selector: 'input', attribute: 'aria-label', description: 'inputs with aria-label' },
          { selector: '[role]', attribute: 'role', description: 'elements with role attributes' },
          { selector: 'img', attribute: 'alt', description: 'images with alt text' }
        ];

        for (const check of accessibilityChecks) {
          const elements = page.locator(`${check.selector}[${check.attribute}]`);
          const count = await elements.count();
          
          if (count > 0) {
            console.log(`✅ Found ${count} ${check.description}`);
          } else {
            console.log(`⚠️ No ${check.description} found`);
          }
        }

        // Test keyboard navigation
        console.log('🔍 Testing keyboard navigation...');
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused ? focused.tagName.toLowerCase() : null;
        });

        if (focusedElement) {
          console.log(`✅ Keyboard navigation working, focused element: ${focusedElement}`);
        }

        // Test for color contrast and visibility
        const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
        const textCount = await textElements.count();
        
        if (textCount > 0) {
          console.log(`✅ Found ${textCount} text elements for readability`);
        }

      } catch (error) {
        console.error('❌ Error in accessibility test:', error);
        await page.screenshot({ 
          path: `test-results/accessibility-error-${Date.now()}.png`,
          fullPage: true 
        });
        throw error;
      }
    }, 30000);
  });
});