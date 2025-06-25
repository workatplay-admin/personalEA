#!/usr/bin/env node
import { join, dirname, resolve } from 'path';
import { readFile, writeFile, ensureDir, readdir } from 'fs-extra';
import { glob } from 'fast-glob';
import jsdoc from 'jsdoc-api';
import matter from 'gray-matter';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { extractCodeComments } from '../utils/comment-extractor.js';
import { generateMarkdown } from '../utils/markdown-generator.js';
import { saveToMemory } from '../utils/memory-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../../../..');

/**
 * Documentation Generator
 * Extracts documentation from code, configuration files, and existing docs
 * Generates comprehensive documentation with smart linking and search
 */
class DocumentationGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: join(PROJECT_ROOT, 'docs/generated'),
      includeTests: false,
      includePrivate: false,
      ...options
    };
    this.metadata = {
      generated: new Date().toISOString(),
      files: [],
      apis: [],
      components: [],
      services: [],
      guides: []
    };
  }

  async generate() {
    const spinner = ora('Generating documentation...').start();
    
    try {
      // 1. Scan for all source files
      spinner.text = 'Scanning source files...';
      const sourceFiles = await this.scanSourceFiles();
      
      // 2. Extract documentation from code
      spinner.text = 'Extracting code documentation...';
      const codeDocs = await this.extractCodeDocs(sourceFiles);
      
      // 3. Parse API specifications
      spinner.text = 'Parsing API specifications...';
      const apiDocs = await this.parseApiSpecs();
      
      // 4. Process existing markdown docs
      spinner.text = 'Processing existing documentation...';
      const markdownDocs = await this.processMarkdownDocs();
      
      // 5. Extract component documentation
      spinner.text = 'Extracting component documentation...';
      const componentDocs = await this.extractComponentDocs();
      
      // 6. Generate service documentation
      spinner.text = 'Generating service documentation...';
      const serviceDocs = await this.generateServiceDocs();
      
      // 7. Build documentation structure
      spinner.text = 'Building documentation structure...';
      const structure = await this.buildDocStructure({
        code: codeDocs,
        api: apiDocs,
        markdown: markdownDocs,
        components: componentDocs,
        services: serviceDocs
      });
      
      // 8. Generate output files
      spinner.text = 'Writing documentation files...';
      await this.writeDocumentation(structure);
      
      // 9. Generate index and search data
      spinner.text = 'Building search index...';
      await this.generateSearchIndex(structure);
      
      // 10. Save to memory
      spinner.text = 'Saving to memory...';
      await saveToMemory('swarm-development-centralized-1750867893094/automation-engineer/docs-metadata', this.metadata);
      
      spinner.succeed(chalk.green(`Documentation generated successfully!`));
      console.log(chalk.cyan(`\nGenerated ${this.metadata.files.length} documentation files`));
      console.log(chalk.cyan(`Location: ${this.options.outputDir}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Documentation generation failed'));
      console.error(error);
      process.exit(1);
    }
  }

  async scanSourceFiles() {
    const patterns = [
      'src/**/*.{js,ts,jsx,tsx}',
      'services/**/src/**/*.{js,ts}',
      'automation/**/*.{js,ts}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/build/**'
    ];
    
    if (this.options.includeTests) {
      patterns.push('**/*.{test,spec}.{js,ts}');
    }
    
    return await glob(patterns, {
      cwd: PROJECT_ROOT,
      absolute: true
    });
  }

  async extractCodeDocs(files) {
    const docs = [];
    
    for (const file of files) {
      try {
        // Extract JSDoc comments
        const jsdocData = await jsdoc.explain({ files: file });
        
        // Extract inline comments and annotations
        const content = await readFile(file, 'utf-8');
        const comments = extractCodeComments(content, file);
        
        // Combine and process
        const fileDoc = {
          file: file.replace(PROJECT_ROOT, '.'),
          jsdoc: jsdocData.filter(d => d.kind !== 'package'),
          comments: comments,
          functions: [],
          classes: [],
          exports: []
        };
        
        // Process JSDoc data
        for (const item of fileDoc.jsdoc) {
          if (item.kind === 'function') {
            fileDoc.functions.push(this.processFunctionDoc(item));
          } else if (item.kind === 'class') {
            fileDoc.classes.push(this.processClassDoc(item));
          }
        }
        
        if (fileDoc.functions.length > 0 || fileDoc.classes.length > 0) {
          docs.push(fileDoc);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not process ${file}: ${error.message}`));
      }
    }
    
    return docs;
  }

  processFunctionDoc(item) {
    return {
      name: item.name,
      description: item.description || '',
      params: (item.params || []).map(p => ({
        name: p.name,
        type: p.type?.names?.join(' | ') || 'any',
        description: p.description || '',
        optional: p.optional || false,
        defaultValue: p.defaultvalue
      })),
      returns: item.returns?.[0] ? {
        type: item.returns[0].type?.names?.join(' | ') || 'any',
        description: item.returns[0].description || ''
      } : null,
      examples: item.examples || [],
      async: item.async || false,
      access: item.access || 'public',
      line: item.meta?.lineno
    };
  }

  processClassDoc(item) {
    return {
      name: item.name,
      description: item.description || '',
      extends: item.augments || [],
      constructor: item.constructorComment ? this.processFunctionDoc(item.constructorComment) : null,
      methods: [],
      properties: [],
      access: item.access || 'public',
      line: item.meta?.lineno
    };
  }

  async parseApiSpecs() {
    const apiSpecs = await glob('docs/**/*.yaml', {
      cwd: PROJECT_ROOT,
      absolute: true
    });
    
    const docs = [];
    
    for (const specFile of apiSpecs) {
      try {
        const content = await readFile(specFile, 'utf-8');
        const spec = yaml.parse(content);
        
        const apiDoc = {
          file: specFile.replace(PROJECT_ROOT, '.'),
          title: spec.info?.title || 'API',
          version: spec.info?.version || '1.0.0',
          description: spec.info?.description || '',
          servers: spec.servers || [],
          endpoints: this.extractEndpoints(spec.paths || {}),
          components: spec.components || {}
        };
        
        docs.push(apiDoc);
        this.metadata.apis.push({
          title: apiDoc.title,
          version: apiDoc.version,
          file: apiDoc.file
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not parse ${specFile}: ${error.message}`));
      }
    }
    
    return docs;
  }

  extractEndpoints(paths) {
    const endpoints = [];
    
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === 'object') {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary || '',
            description: operation.description || '',
            tags: operation.tags || [],
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses || {},
            security: operation.security || []
          });
        }
      }
    }
    
    return endpoints;
  }

  async processMarkdownDocs() {
    const mdFiles = await glob('**/*.md', {
      cwd: PROJECT_ROOT,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', 'docs/generated/**']
    });
    
    const docs = [];
    
    for (const file of mdFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const { data, content: body } = matter(content);
        
        const doc = {
          file: file.replace(PROJECT_ROOT, '.'),
          title: data.title || this.extractTitle(body) || file.split('/').pop(),
          category: data.category || this.categorizeDoc(file),
          tags: data.tags || [],
          description: data.description || this.extractDescription(body),
          content: body,
          metadata: data,
          toc: this.extractTableOfContents(body)
        };
        
        docs.push(doc);
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not process ${file}: ${error.message}`));
      }
    }
    
    return docs;
  }

  extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : null;
  }

  extractDescription(content) {
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#') && !line.startsWith('```')) {
        return line;
      }
    }
    return '';
  }

  categorizeDoc(file) {
    if (file.includes('/guides/')) return 'guide';
    if (file.includes('/api/')) return 'api';
    if (file.includes('/services/')) return 'service';
    if (file.includes('/tutorials/')) return 'tutorial';
    if (file.includes('/reference/')) return 'reference';
    if (file.includes('/sparc/')) return 'sparc';
    return 'general';
  }

  extractTableOfContents(content) {
    const toc = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      toc.push({
        level: match[1].length,
        text: match[2],
        slug: this.slugify(match[2])
      });
    }
    
    return toc;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  async extractComponentDocs() {
    // Extract React/Vue component documentation
    const componentFiles = await glob('**/*.{jsx,tsx,vue}', {
      cwd: PROJECT_ROOT,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**']
    });
    
    const docs = [];
    
    for (const file of componentFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const componentDoc = await this.parseComponentFile(content, file);
        if (componentDoc) {
          docs.push(componentDoc);
          this.metadata.components.push({
            name: componentDoc.name,
            file: componentDoc.file
          });
        }
      } catch (error) {
        // Skip files that can't be parsed
      }
    }
    
    return docs;
  }

  async parseComponentFile(content, file) {
    // Simple component extraction - can be enhanced
    const componentMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const|class)\s+|(?:function|const|class)\s+)(\w+)/m);
    
    if (!componentMatch) return null;
    
    const name = componentMatch[1];
    const props = this.extractProps(content);
    const methods = this.extractMethods(content);
    
    return {
      file: file.replace(PROJECT_ROOT, '.'),
      name,
      type: file.endsWith('.vue') ? 'vue' : 'react',
      props,
      methods,
      description: this.extractComponentDescription(content)
    };
  }

  extractProps(content) {
    const props = [];
    // Simple prop extraction - can be enhanced with AST parsing
    const propMatches = content.matchAll(/(?:props\.)(\w+)|(?:const\s+{[^}]*}\s*=\s*props)/gm);
    
    for (const match of propMatches) {
      if (match[1]) {
        props.push({ name: match[1] });
      }
    }
    
    return [...new Set(props.map(p => p.name))].map(name => ({ name }));
  }

  extractMethods(content) {
    const methods = [];
    const methodMatches = content.matchAll(/(?:const|function)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function)/gm);
    
    for (const match of methodMatches) {
      methods.push({ name: match[1] });
    }
    
    return methods;
  }

  extractComponentDescription(content) {
    const match = content.match(/\/\*\*\s*\n([^*]|\*(?!\/))*\*\//m);
    if (match) {
      return match[0].replace(/\/\*\*|\*\//g, '').replace(/\s*\*\s?/gm, '\n').trim();
    }
    return '';
  }

  async generateServiceDocs() {
    const services = await readdir(join(PROJECT_ROOT, 'services')).catch(() => []);
    const docs = [];
    
    for (const service of services) {
      const servicePath = join(PROJECT_ROOT, 'services', service);
      const packagePath = join(servicePath, 'package.json');
      
      try {
        const packageJson = await readFile(packagePath, 'utf-8').then(JSON.parse);
        const readmePath = join(servicePath, 'README.md');
        const readme = await readFile(readmePath, 'utf-8').catch(() => '');
        
        const serviceDoc = {
          name: service,
          description: packageJson.description || '',
          version: packageJson.version,
          scripts: packageJson.scripts || {},
          dependencies: Object.keys(packageJson.dependencies || {}),
          readme: readme,
          endpoints: await this.extractServiceEndpoints(servicePath),
          configuration: await this.extractServiceConfig(servicePath)
        };
        
        docs.push(serviceDoc);
        this.metadata.services.push({
          name: service,
          version: serviceDoc.version
        });
      } catch (error) {
        // Skip services without package.json
      }
    }
    
    return docs;
  }

  async extractServiceEndpoints(servicePath) {
    // Extract endpoints from route files
    const routeFiles = await glob('**/routes/**/*.{js,ts}', {
      cwd: servicePath,
      absolute: true
    });
    
    const endpoints = [];
    
    for (const file of routeFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const routeMatches = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]|app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/gm);
        
        for (const match of routeMatches) {
          endpoints.push({
            method: (match[1] || match[3]).toUpperCase(),
            path: match[2] || match[4],
            file: file.replace(servicePath, '.')
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return endpoints;
  }

  async extractServiceConfig(servicePath) {
    const configFiles = await glob('**/config/**/*.{js,ts,json}', {
      cwd: servicePath,
      absolute: true
    });
    
    const configs = [];
    
    for (const file of configFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        configs.push({
          file: file.replace(servicePath, '.'),
          type: file.endsWith('.json') ? 'json' : 'js',
          content: file.endsWith('.json') ? JSON.parse(content) : 'See file for configuration'
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return configs;
  }

  async buildDocStructure(allDocs) {
    return {
      overview: await this.generateOverview(allDocs),
      api: this.structureApiDocs(allDocs.api),
      services: this.structureServiceDocs(allDocs.services),
      components: this.structureComponentDocs(allDocs.components),
      guides: this.structureGuides(allDocs.markdown),
      reference: this.structureReference(allDocs.code),
      search: this.buildSearchableContent(allDocs)
    };
  }

  async generateOverview(allDocs) {
    const stats = {
      totalFiles: this.metadata.files.length,
      apis: this.metadata.apis.length,
      services: this.metadata.services.length,
      components: this.metadata.components.length,
      guides: this.metadata.guides.length
    };
    
    return {
      title: 'PersonalEA Documentation',
      description: 'Comprehensive documentation for the PersonalEA project',
      generated: this.metadata.generated,
      stats,
      quickLinks: this.generateQuickLinks(allDocs)
    };
  }

  generateQuickLinks(allDocs) {
    const links = [
      { title: 'Getting Started', path: '/guides/developer-onboarding' },
      { title: 'API Reference', path: '/api' },
      { title: 'Service Documentation', path: '/services' },
      { title: 'Architecture Overview', path: '/reference/architecture/system-overview' },
      { title: 'Testing Guide', path: '/guides/testing-strategy' },
      { title: 'Deployment', path: '/guides/deployment-operations' }
    ];
    
    // Add dynamic links based on available content
    if (allDocs.markdown.some(d => d.file.includes('CONTRIBUTING'))) {
      links.push({ title: 'Contributing', path: '/contributing' });
    }
    
    return links;
  }

  structureApiDocs(apiDocs) {
    return apiDocs.map(api => ({
      ...api,
      navigation: this.generateApiNavigation(api),
      endpointsByTag: this.groupEndpointsByTag(api.endpoints)
    }));
  }

  generateApiNavigation(api) {
    const nav = [];
    const tags = [...new Set(api.endpoints.flatMap(e => e.tags))];
    
    tags.forEach(tag => {
      nav.push({
        title: tag,
        endpoints: api.endpoints
          .filter(e => e.tags.includes(tag))
          .map(e => ({ method: e.method, path: e.path, summary: e.summary }))
      });
    });
    
    return nav;
  }

  groupEndpointsByTag(endpoints) {
    const grouped = {};
    
    endpoints.forEach(endpoint => {
      const tags = endpoint.tags.length > 0 ? endpoint.tags : ['Other'];
      tags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        grouped[tag].push(endpoint);
      });
    });
    
    return grouped;
  }

  structureServiceDocs(serviceDocs) {
    return serviceDocs.map(service => ({
      ...service,
      navigation: this.generateServiceNavigation(service)
    }));
  }

  generateServiceNavigation(service) {
    return [
      { title: 'Overview', anchor: 'overview' },
      { title: 'Installation', anchor: 'installation' },
      { title: 'Configuration', anchor: 'configuration' },
      { title: 'API Endpoints', anchor: 'endpoints' },
      { title: 'Scripts', anchor: 'scripts' },
      { title: 'Dependencies', anchor: 'dependencies' }
    ];
  }

  structureComponentDocs(componentDocs) {
    const grouped = {};
    
    componentDocs.forEach(comp => {
      const category = comp.type || 'other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(comp);
    });
    
    return grouped;
  }

  structureGuides(markdownDocs) {
    const guides = markdownDocs.filter(d => d.category === 'guide');
    const categorized = {};
    
    guides.forEach(guide => {
      const category = this.extractGuideCategory(guide.file);
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push(guide);
    });
    
    return categorized;
  }

  extractGuideCategory(file) {
    if (file.includes('api')) return 'API Integration';
    if (file.includes('deploy')) return 'Deployment';
    if (file.includes('test')) return 'Testing';
    if (file.includes('claude')) return 'Claude Integration';
    return 'General';
  }

  structureReference(codeDocs) {
    const reference = {
      functions: [],
      classes: [],
      modules: []
    };
    
    codeDocs.forEach(doc => {
      doc.functions.forEach(func => {
        reference.functions.push({
          ...func,
          module: doc.file
        });
      });
      
      doc.classes.forEach(cls => {
        reference.classes.push({
          ...cls,
          module: doc.file
        });
      });
    });
    
    return reference;
  }

  buildSearchableContent(allDocs) {
    const searchData = [];
    
    // Add markdown docs
    allDocs.markdown.forEach(doc => {
      searchData.push({
        type: 'document',
        title: doc.title,
        description: doc.description,
        content: doc.content,
        path: doc.file,
        tags: doc.tags
      });
    });
    
    // Add API endpoints
    allDocs.api.forEach(api => {
      api.endpoints.forEach(endpoint => {
        searchData.push({
          type: 'api-endpoint',
          title: `${endpoint.method} ${endpoint.path}`,
          description: endpoint.description || endpoint.summary,
          content: JSON.stringify(endpoint),
          path: `${api.file}#${endpoint.operationId}`,
          tags: endpoint.tags
        });
      });
    });
    
    // Add functions and classes
    allDocs.code.forEach(codeDoc => {
      codeDoc.functions.forEach(func => {
        searchData.push({
          type: 'function',
          title: func.name,
          description: func.description,
          content: JSON.stringify(func),
          path: `${codeDoc.file}#${func.name}`,
          tags: ['code', 'function']
        });
      });
      
      codeDoc.classes.forEach(cls => {
        searchData.push({
          type: 'class',
          title: cls.name,
          description: cls.description,
          content: JSON.stringify(cls),
          path: `${codeDoc.file}#${cls.name}`,
          tags: ['code', 'class']
        });
      });
    });
    
    return searchData;
  }

  async writeDocumentation(structure) {
    await ensureDir(this.options.outputDir);
    
    // Write overview
    await this.writeJsonFile('index.json', structure.overview);
    await this.writeMarkdownFile('README.md', generateMarkdown.overview(structure.overview));
    
    // Write API docs
    await ensureDir(join(this.options.outputDir, 'api'));
    for (const api of structure.api) {
      const apiName = api.title.toLowerCase().replace(/\s+/g, '-');
      await this.writeJsonFile(`api/${apiName}.json`, api);
      await this.writeMarkdownFile(`api/${apiName}.md`, generateMarkdown.api(api));
    }
    
    // Write service docs
    await ensureDir(join(this.options.outputDir, 'services'));
    for (const service of structure.services) {
      await this.writeJsonFile(`services/${service.name}.json`, service);
      await this.writeMarkdownFile(`services/${service.name}.md`, generateMarkdown.service(service));
    }
    
    // Write component docs
    await ensureDir(join(this.options.outputDir, 'components'));
    await this.writeJsonFile('components/index.json', structure.components);
    
    // Write guides
    await ensureDir(join(this.options.outputDir, 'guides'));
    for (const [category, guides] of Object.entries(structure.guides)) {
      const categorySlug = this.slugify(category);
      await ensureDir(join(this.options.outputDir, 'guides', categorySlug));
      
      for (const guide of guides) {
        const guideName = guide.title.toLowerCase().replace(/\s+/g, '-');
        await this.writeJsonFile(`guides/${categorySlug}/${guideName}.json`, guide);
      }
    }
    
    // Write reference
    await ensureDir(join(this.options.outputDir, 'reference'));
    await this.writeJsonFile('reference/index.json', structure.reference);
    await this.writeMarkdownFile('reference/functions.md', generateMarkdown.functions(structure.reference.functions));
    await this.writeMarkdownFile('reference/classes.md', generateMarkdown.classes(structure.reference.classes));
    
    // Write search data
    await this.writeJsonFile('search-index.json', structure.search);
  }

  async writeJsonFile(relativePath, data) {
    const filePath = join(this.options.outputDir, relativePath);
    await ensureDir(dirname(filePath));
    await writeFile(filePath, JSON.stringify(data, null, 2));
    this.metadata.files.push(filePath);
  }

  async writeMarkdownFile(relativePath, content) {
    const filePath = join(this.options.outputDir, relativePath);
    await ensureDir(dirname(filePath));
    await writeFile(filePath, content);
    this.metadata.files.push(filePath);
  }

  async generateSearchIndex(structure) {
    // This will be implemented by the search indexer
    const indexPath = join(this.options.outputDir, 'search-index.json');
    await writeFile(indexPath, JSON.stringify(structure.search, null, 2));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new DocumentationGenerator();
  generator.generate();
}

export { DocumentationGenerator };