#!/usr/bin/env node

/**
 * Documentation Generator Script
 * 
 * Automatically generates and updates documentation:
 * - API documentation from OpenAPI specs
 * - Service documentation from code comments
 * - Architecture diagrams from service dependencies
 * - Developer guides from templates
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate API documentation from OpenAPI specs
 */
async function generateApiDocs() {
  console.log('\n📘 Generating API documentation...');
  
  const apiSpecs = [
    'docs/email-service-api-v1.yaml',
    'docs/goal-strategy-service-api-v1.yaml',
    'docs/calendar-service-api-v1.yaml'
  ];
  
  for (const spec of apiSpecs) {
    const serviceName = path.basename(spec, '.yaml').replace('-api-v1', '');
    const outputPath = `docs/api/${serviceName}.md`;
    
    try {
      // Generate markdown from OpenAPI spec
      execSync(`npx @redocly/cli build-docs ${spec} --output ${outputPath}.html`);
      
      // Also generate a markdown version
      const specContent = await fs.readFile(spec, 'utf-8');
      const yaml = require('js-yaml');
      const apiDoc = yaml.load(specContent);
      
      const markdown = generateMarkdownFromOpenAPI(apiDoc, serviceName);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, markdown);
      
      console.log(`   ✅ Generated docs for ${serviceName}`);
    } catch (error) {
      console.error(`   ❌ Failed to generate docs for ${serviceName}: ${error.message}`);
    }
  }
}

/**
 * Generate markdown documentation from OpenAPI spec
 */
function generateMarkdownFromOpenAPI(spec, serviceName) {
  const { info, paths, components } = spec;
  
  let markdown = `# ${info.title}\n\n`;
  markdown += `${info.description}\n\n`;
  markdown += `**Version:** ${info.version}\n\n`;
  
  // Table of Contents
  markdown += '## Table of Contents\n\n';
  markdown += '- [Overview](#overview)\n';
  markdown += '- [Authentication](#authentication)\n';
  markdown += '- [Endpoints](#endpoints)\n';
  markdown += '- [Models](#models)\n';
  markdown += '- [Error Handling](#error-handling)\n\n';
  
  // Overview
  markdown += '## Overview\n\n';
  markdown += `The ${serviceName} service provides the following capabilities:\n\n`;
  
  // Endpoints
  markdown += '## Endpoints\n\n';
  
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        markdown += `### ${method.toUpperCase()} ${pathKey}\n\n`;
        markdown += `${operation.summary || ''}\n\n`;
        
        if (operation.description) {
          markdown += `${operation.description}\n\n`;
        }
        
        if (operation.parameters) {
          markdown += '**Parameters:**\n\n';
          markdown += '| Name | Type | Required | Description |\n';
          markdown += '|------|------|----------|-------------|\n';
          
          for (const param of operation.parameters) {
            markdown += `| ${param.name} | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |\n`;
          }
          markdown += '\n';
        }
        
        if (operation.requestBody) {
          markdown += '**Request Body:**\n\n';
          markdown += '```json\n';
          markdown += JSON.stringify(getExampleFromSchema(operation.requestBody), null, 2);
          markdown += '\n```\n\n';
        }
        
        markdown += '**Responses:**\n\n';
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          markdown += `- **${statusCode}**: ${response.description}\n`;
        }
        markdown += '\n';
      }
    }
  }
  
  // Models
  if (components && components.schemas) {
    markdown += '## Models\n\n';
    
    for (const [schemaName, schema] of Object.entries(components.schemas)) {
      markdown += `### ${schemaName}\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(getExampleFromSchema({ content: { 'application/json': { schema } } }), null, 2);
      markdown += '\n```\n\n';
    }
  }
  
  return markdown;
}

/**
 * Extract example from schema
 */
function getExampleFromSchema(item) {
  if (!item.content) return {};
  
  const content = item.content['application/json'];
  if (!content) return {};
  
  if (content.example) return content.example;
  if (content.examples && Object.keys(content.examples).length > 0) {
    return content.examples[Object.keys(content.examples)[0]].value;
  }
  
  // Generate example from schema
  return generateExampleFromSchema(content.schema);
}

/**
 * Generate example data from schema
 */
function generateExampleFromSchema(schema) {
  if (!schema) return {};
  
  if (schema.example) return schema.example;
  
  switch (schema.type) {
    case 'object':
      const obj = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(prop);
        }
      }
      return obj;
      
    case 'array':
      return [generateExampleFromSchema(schema.items)];
      
    case 'string':
      return schema.example || 'string';
      
    case 'number':
    case 'integer':
      return schema.example || 0;
      
    case 'boolean':
      return schema.example || false;
      
    default:
      return null;
  }
}

/**
 * Generate service documentation from code
 */
async function generateServiceDocs() {
  console.log('\n📦 Generating service documentation...');
  
  const servicesDir = path.join(process.cwd(), 'services');
  
  try {
    const services = await fs.readdir(servicesDir);
    
    for (const service of services) {
      const servicePath = path.join(servicesDir, service);
      const stats = await fs.stat(servicePath);
      
      if (stats.isDirectory()) {
        await generateServiceReadme(service, servicePath);
      }
    }
  } catch (error) {
    console.error(`   ❌ Failed to generate service docs: ${error.message}`);
  }
}

/**
 * Generate README for a service
 */
async function generateServiceReadme(serviceName, servicePath) {
  const readmePath = path.join(servicePath, 'README.md');
  
  // Check if README exists and has placeholder content
  let existingContent = '';
  try {
    existingContent = await fs.readFile(readmePath, 'utf-8');
    if (!existingContent.includes('<!-- AUTO-GENERATED')) {
      console.log(`   ℹ️  Skipping ${serviceName} - README exists and is not auto-generated`);
      return;
    }
  } catch (error) {
    // README doesn't exist, we'll create it
  }
  
  // Generate README content
  const packageJsonPath = path.join(servicePath, 'package.json');
  let packageInfo = {};
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    packageInfo = JSON.parse(packageContent);
  } catch (error) {
    // No package.json
  }
  
  let readme = `<!-- AUTO-GENERATED-CONTENT:START -->\n`;
  readme += `# ${packageInfo.name || serviceName}\n\n`;
  readme += `${packageInfo.description || `The ${serviceName} service for PersonalEA.`}\n\n`;
  
  readme += `## Overview\n\n`;
  readme += `This service is part of the PersonalEA microservices architecture.\n\n`;
  
  readme += `## Installation\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `cd services/${serviceName}\n`;
  readme += `npm install\n`;
  readme += `\`\`\`\n\n`;
  
  readme += `## Configuration\n\n`;
  readme += `Create a \`.env\` file with the following variables:\n\n`;
  readme += `\`\`\`env\n`;
  readme += `NODE_ENV=development\n`;
  readme += `PORT=8080\n`;
  readme += `# Add service-specific configuration\n`;
  readme += `\`\`\`\n\n`;
  
  readme += `## Development\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `npm run dev\n`;
  readme += `\`\`\`\n\n`;
  
  readme += `## Testing\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `npm test\n`;
  readme += `\`\`\`\n\n`;
  
  readme += `## API Documentation\n\n`;
  readme += `See the [API documentation](../../docs/api/${serviceName}.md) for detailed endpoint information.\n\n`;
  
  readme += `## Scripts\n\n`;
  if (packageInfo.scripts) {
    readme += '| Script | Description |\n';
    readme += '|--------|-------------|\n';
    
    for (const [script, command] of Object.entries(packageInfo.scripts)) {
      readme += `| \`npm run ${script}\` | ${command} |\n`;
    }
    readme += '\n';
  }
  
  readme += `<!-- AUTO-GENERATED-CONTENT:END -->\n`;
  
  await fs.writeFile(readmePath, readme);
  console.log(`   ✅ Generated README for ${serviceName}`);
}

/**
 * Generate developer onboarding guide
 */
async function generateOnboardingGuide() {
  console.log('\n👨‍💻 Generating developer onboarding guide...');
  
  const guidePath = path.join(process.cwd(), 'docs', 'developer-onboarding.md');
  
  let guide = `# Developer Onboarding Guide\n\n`;
  guide += `Welcome to the PersonalEA project! This guide will help you get started with development.\n\n`;
  
  guide += `## Prerequisites\n\n`;
  guide += `- Node.js >= 18.0.0\n`;
  guide += `- npm >= 9.0.0\n`;
  guide += `- Docker and Docker Compose\n`;
  guide += `- Git\n\n`;
  
  guide += `## Quick Start\n\n`;
  guide += `1. Clone the repository:\n`;
  guide += `   \`\`\`bash\n`;
  guide += `   git clone <repository-url>\n`;
  guide += `   cd personalEA\n`;
  guide += `   \`\`\`\n\n`;
  
  guide += `2. Install dependencies:\n`;
  guide += `   \`\`\`bash\n`;
  guide += `   npm install\n`;
  guide += `   \`\`\`\n\n`;
  
  guide += `3. Set up environment:\n`;
  guide += `   \`\`\`bash\n`;
  guide += `   cp .env.example .env\n`;
  guide += `   # Edit .env with your configuration\n`;
  guide += `   \`\`\`\n\n`;
  
  guide += `4. Start development services:\n`;
  guide += `   \`\`\`bash\n`;
  guide += `   npm run mock:docker\n`;
  guide += `   \`\`\`\n\n`;
  
  guide += `5. Run tests:\n`;
  guide += `   \`\`\`bash\n`;
  guide += `   npm test\n`;
  guide += `   \`\`\`\n\n`;
  
  guide += `## Project Structure\n\n`;
  guide += `\`\`\`\n`;
  guide += `personalEA/\n`;
  guide += `├── services/          # Microservices\n`;
  guide += `├── docs/              # Documentation\n`;
  guide += `├── scripts/           # Build and utility scripts\n`;
  guide += `├── tests/             # Integration tests\n`;
  guide += `└── .github/           # CI/CD workflows\n`;
  guide += `\`\`\`\n\n`;
  
  guide += `## Development Workflow\n\n`;
  guide += `1. Create a feature branch\n`;
  guide += `2. Make your changes\n`;
  guide += `3. Run tests and linting\n`;
  guide += `4. Update documentation\n`;
  guide += `5. Submit a pull request\n\n`;
  
  guide += `## Available Commands\n\n`;
  guide += `- \`npm run dev\` - Start development environment\n`;
  guide += `- \`npm test\` - Run all tests\n`;
  guide += `- \`npm run lint\` - Run linting\n`;
  guide += `- \`npm run docs:validate\` - Validate documentation\n`;
  guide += `- \`npm run docs:generate\` - Generate documentation\n\n`;
  
  guide += `## Getting Help\n\n`;
  guide += `- Check the [FAQ](./faq.md)\n`;
  guide += `- Review existing [documentation](./README.md)\n`;
  guide += `- Ask in the team chat\n\n`;
  
  guide += `---\n\n`;
  guide += `*Generated on ${new Date().toISOString()}*\n`;
  
  await fs.writeFile(guidePath, guide);
  console.log(`   ✅ Generated developer onboarding guide`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting documentation generation...\n');
  
  try {
    // Install required dependency if not present
    try {
      require('js-yaml');
    } catch (error) {
      console.log('📦 Installing js-yaml dependency...');
      execSync('npm install --no-save js-yaml');
    }
    
    await generateApiDocs();
    await generateServiceDocs();
    await generateOnboardingGuide();
    
    console.log('\n✅ Documentation generation complete!');
  } catch (error) {
    console.error('\n❌ Documentation generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateDocs: main };