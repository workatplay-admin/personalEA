/**
 * Comment Extractor Utility
 * Extracts various types of comments from source code
 */

/**
 * Extract comments from source code
 * @param {string} content - File content
 * @param {string} filePath - File path for determining language
 * @returns {Array} Extracted comments with metadata
 */
export function extractCodeComments(content, filePath) {
  const comments = [];
  const lines = content.split('\n');
  
  // Determine file type
  const ext = filePath.split('.').pop();
  const isTypeScript = ext === 'ts' || ext === 'tsx';
  const isJavaScript = ext === 'js' || ext === 'jsx';
  const isPython = ext === 'py';
  
  // Extract single-line comments
  const singleLinePattern = isJavaScript || isTypeScript ? /^\/\/(.*)$/ : /^#(.*)$/;
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Single-line comments
    const singleMatch = trimmed.match(singleLinePattern);
    if (singleMatch) {
      const text = singleMatch[1].trim();
      
      // Check for special annotations
      if (text.startsWith('TODO:') || text.startsWith('FIXME:') || text.startsWith('NOTE:')) {
        comments.push({
          type: 'annotation',
          text: text,
          line: index + 1,
          category: text.split(':')[0]
        });
      } else {
        comments.push({
          type: 'single',
          text: text,
          line: index + 1
        });
      }
    }
  });
  
  // Extract multi-line comments
  if (isJavaScript || isTypeScript) {
    const multiLinePattern = /\/\*([^*]|\*(?!\/))*\*\//gm;
    let match;
    
    while ((match = multiLinePattern.exec(content)) !== null) {
      const text = match[0]
        .replace(/\/\*\*?/, '')
        .replace(/\*\//, '')
        .replace(/^\s*\*\s?/gm, '')
        .trim();
      
      // Skip JSDoc comments (handled separately)
      if (!match[0].startsWith('/**')) {
        comments.push({
          type: 'multiline',
          text: text,
          position: match.index
        });
      }
    }
  }
  
  // Extract Python docstrings
  if (isPython) {
    const docstringPattern = /("""|''')([\s\S]*?)\1/gm;
    let match;
    
    while ((match = docstringPattern.exec(content)) !== null) {
      comments.push({
        type: 'docstring',
        text: match[2].trim(),
        position: match.index
      });
    }
  }
  
  return comments;
}

/**
 * Extract TODO/FIXME/NOTE annotations from code
 * @param {string} content - File content
 * @returns {Array} Annotations grouped by type
 */
export function extractAnnotations(content) {
  const annotations = {
    TODO: [],
    FIXME: [],
    NOTE: [],
    HACK: [],
    WARNING: []
  };
  
  const pattern = /(?:\/\/|#|\*)\s*(TODO|FIXME|NOTE|HACK|WARNING):\s*(.+)$/gmi;
  let match;
  
  while ((match = pattern.exec(content)) !== null) {
    const type = match[1].toUpperCase();
    const text = match[2].trim();
    
    if (annotations[type]) {
      annotations[type].push({
        text,
        position: match.index,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  return annotations;
}

/**
 * Extract structured documentation blocks (like JSDoc)
 * @param {string} content - File content  
 * @returns {Array} Documentation blocks
 */
export function extractDocBlocks(content) {
  const blocks = [];
  const jsdocPattern = /\/\*\*([^*]|\*(?!\/))*\*\//gm;
  let match;
  
  while ((match = jsdocPattern.exec(content)) !== null) {
    const text = match[0];
    const lines = text.split('\n');
    const parsed = {
      description: '',
      tags: [],
      position: match.index,
      raw: text
    };
    
    // Parse JSDoc content
    let inDescription = true;
    lines.forEach(line => {
      const cleaned = line.replace(/^\/\*\*|\*\/|^\s*\*\s?/g, '').trim();
      
      if (cleaned.startsWith('@')) {
        inDescription = false;
        const tagMatch = cleaned.match(/@(\w+)\s*(.*)/);
        if (tagMatch) {
          parsed.tags.push({
            tag: tagMatch[1],
            value: tagMatch[2]
          });
        }
      } else if (inDescription && cleaned) {
        parsed.description += (parsed.description ? '\n' : '') + cleaned;
      }
    });
    
    blocks.push(parsed);
  }
  
  return blocks;
}

/**
 * Extract inline documentation (comments next to code)
 * @param {string} content - File content
 * @returns {Array} Inline documentation
 */
export function extractInlineDocs(content) {
  const docs = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Match patterns like: someCode(); // This does something
    const match = line.match(/^(.+?)\s*\/\/\s*(.+)$/);
    if (match && match[1].trim() && match[2].trim()) {
      docs.push({
        code: match[1].trim(),
        comment: match[2].trim(),
        line: index + 1
      });
    }
  });
  
  return docs;
}