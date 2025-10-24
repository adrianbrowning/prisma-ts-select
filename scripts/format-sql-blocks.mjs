#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const README_PATH = join(__dirname, '../packages/prisma-ts-select/README.md');

/**
 * Format SQL string with proper indentation and line breaks
 */
function formatSQL(sql) {
  // Strip leading quotes and trailing semicolons/quotes
  sql = sql.replace(/^["\s]+/, '').replace(/[";"\s]+$/, '');

  // Add semicolon at the end if not present
  if (!sql.endsWith(';')) {
    sql += ';';
  }

  // Keywords that should start a new line
  const keywords = ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET'];

  // Check if this is a simple query (single SELECT without aliases, no joins/where)
  const isSimple = !sql.includes(' AS ') &&
                   !keywords.some(kw => sql.includes(` ${kw} `)) &&
                   (sql.match(/SELECT/gi) || []).length === 1;

  if (isSimple) {
    return sql;
  }

  let formatted = sql;

  // Handle SELECT clause - check if we need multi-line
  const selectMatch = formatted.match(/SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM/i);
  if (selectMatch) {
    const distinct = selectMatch[1] || '';
    const columns = selectMatch[2];

    // Multi-line if: multiple columns with aliases, or 3+ columns
    const hasAliases = columns.includes(' AS ');
    const columnCount = columns.split(',').length;

    if ((hasAliases && columnCount >= 2) || columnCount >= 3) {
      const columnList = columns.split(',').map(col => col.trim());
      const formattedColumns = columnList.map((col) =>`  ${col}`).join(',\n');

      formatted = formatted.replace(
        /SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM/i,
        `SELECT ${distinct}\n${formattedColumns}\nFROM`
      );
    }
  }

  // Add line breaks before keywords
  keywords.forEach(keyword => {
    // Use word boundaries and preserve case
    const regex = new RegExp(`\\s+(${keyword})\\s+`, 'gi');
    formatted = formatted.replace(regex, `\n${keyword} `);
  });

  // Clean up multiple newlines
  formatted = formatted.replace(/\n{2,}/g, '\n');

  // Trim and ensure it ends with semicolon
  return formatted.trim();
}

/**
 * Add semicolon to TypeScript code if not present
 */
function ensureTypescriptSemicolon(code) {
  const lines = code.split('\n');

  // Find the last non-empty line
  let lastLineIndex = lines.length - 1;
  while (lastLineIndex >= 0 && lines[lastLineIndex].trim() === '') {
    lastLineIndex--;
  }

  if (lastLineIndex < 0) return code;

  const lastLine = lines[lastLineIndex];
  const trimmed = lastLine.trimEnd();

  // Don't add semicolon if:
  // - Already ends with semicolon
  // - Ends with structural characters
  // - Is a comment
  if (trimmed.endsWith(';') ||
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed.endsWith('*/') ||
      trimmed.match(/^\s*(\/\/|\/\*)/)) {
    return code;
  }

  // Add semicolon to last line
  lines[lastLineIndex] = trimmed + ';';

  // Preserve trailing empty lines
  return lines.join('\n');
}

/**
 * Process README file and format SQL/TypeScript blocks
 */
function processREADME() {
  console.log('Reading README.md...');
  const content = readFileSync(README_PATH, 'utf-8');
  const lines = content.split('\n');

  let inCodeBlock = false;
  let blockType = null; // 'sql' or 'typescript'
  let result = [];
  let codeLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect SQL block start with file= annotation
    if (line.match(/^```sql file=/)) {
      inCodeBlock = true;
      blockType = 'sql';
      result.push(line);
      codeLines = [];
      continue;
    }

    // Detect TypeScript block start with file= annotation
    if (line.match(/^```typescript file=/)) {
      inCodeBlock = true;
      blockType = 'typescript';
      result.push(line);
      codeLines = [];
      continue;
    }

    // Detect block end
    if (inCodeBlock && line === '```') {
      // Format and add code lines
      if (codeLines.length > 0) {
        const rawCode = codeLines.join('\n');
        let formatted;

        if (blockType === 'sql') {
          formatted = formatSQL(rawCode);
        } else if (blockType === 'typescript') {
          formatted = ensureTypescriptSemicolon(rawCode);
        } else {
          formatted = rawCode;
        }

        result.push(formatted);
      }
      result.push(line);
      inCodeBlock = false;
      blockType = null;
      codeLines = [];
      continue;
    }

    // Collect code lines
    if (inCodeBlock) {
      codeLines.push(line);
    } else {
      result.push(line);
    }
  }

  const newContent = result.join('\n');

  console.log('Writing formatted README.md...');
  writeFileSync(README_PATH, newContent, 'utf-8');
  console.log('✅ Code blocks formatted successfully!');
}

// Run
processREADME();
