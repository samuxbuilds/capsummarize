#!/usr/bin/env node

/**
 * Build script that replaces environment variables in browser extension code
 * 
 * Browser extensions cannot access process.env directly, so we replace
 * placeholders during the build process.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
function loadEnv() {
  const env = {};
  
  // Load from .env file if it exists
  try {
    const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.log('No .env file found, using defaults');
  }
  
  // Override with process.env if available
  return {
    ...env,
    NODE_ENV: process.env.NODE_ENV || env.NODE_ENV || 'production',
  };
}

// Process a single file
function processFile(filePath, env) {
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // Replace environment variable placeholders
    content = content.replace(/__NODE_ENV__/g, `"${env.NODE_ENV}"`);
    
    writeFileSync(filePath, content);
    console.log(`Processed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process all TypeScript files in a directory
function processDirectory(dirPath, env) {
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath, env);
      } else if (item.endsWith('.ts')) {
        processFile(itemPath, env);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

// Main execution
function main() {
  console.log('Building with environment variables...');
  
  const env = loadEnv();
  console.log('Environment:', env);
  
  // Process source files
  const srcDir = join(projectRoot, 'src');
  processDirectory(srcDir, env);
  
  console.log('Environment variable replacement completed!');
}

main();
