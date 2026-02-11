#!/usr/bin/env node
/**
 * Update test imports for v7 adapter pattern
 * Replaces @prisma/client imports + client instantiation with shared client.ts import
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Recursively find all .ts files in tests/ directory
function findTsFiles(dir, files = []) {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      findTsFiles(path, files)
    } else if (entry.endsWith('.ts') && !['client.ts', 'test-utils.ts', 'types.ts', 'utils.ts'].includes(entry)) {
      files.push(path)
    }
  }
  return files
}

const files = findTsFiles('tests')

let updatedCount = 0

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  let modified = false

  // Step 1: Remove or comment out PrismaClient import
  if (content.includes('import {PrismaClient} from "@prisma/client"')) {
    content = content.replace(
      /import \{PrismaClient\} from ["']@prisma\/client["'];?\n?/g,
      ''
    )
    modified = true
  }

  // Step 2: Remove tsSelectExtend/prismaTSSelect imports
  if (content.match(/import (tsSelectExtend|prismaTSSelect) from ['"]prisma-ts-select\/extend['"];?\n?/)) {
    content = content.replace(
      /import (tsSelectExtend|prismaTSSelect) from ['"]prisma-ts-select\/extend['"];?\n?/g,
      ''
    )
    modified = true
  }

  // Step 3: Remove client instantiation lines and add client.ts import
  const instantiationPattern = /const prisma = new PrismaClient\([^)]*\)\s*\.\$extends\((tsSelectExtend|prismaTSSelect)\);?\n?/
  if (instantiationPattern.test(content)) {
    content = content.replace(
      instantiationPattern,
      ''
    )

    // Add import at the top (after node imports)
    const importInsertPoint = content.search(/\n(import|\/\/)/)
    if (importInsertPoint > 0) {
      content = content.slice(0, importInsertPoint + 1) +
                `import { prisma } from "../client.ts";\n` +
                content.slice(importInsertPoint + 1)
    }
    modified = true
  }

  if (modified) {
    writeFileSync(file, content)
    updatedCount++
    console.log(`✓ Updated ${file}`)
  }
}

console.log(`\n✓ Updated ${updatedCount} files`)
