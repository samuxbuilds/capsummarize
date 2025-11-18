#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { watch } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchMode = process.argv.includes('--watch') || process.argv.includes('-w');

async function buildCSS() {
  const inputPath = path.join(process.cwd(), 'src/styles/globals.css');
  const outputPath = path.join(process.cwd(), 'dist/styles/globals.css');

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Read input CSS
  const input = await fs.readFile(inputPath, 'utf-8');

  // Process with PostCSS, Tailwind, and Autoprefixer
  const result = await postcss([
    tailwindcss,
    autoprefixer,
  ]).process(input, {
    from: inputPath,
    to: outputPath,
  });

  // Write output
  await fs.writeFile(outputPath, result.css);
  
  if (result.map) {
    await fs.writeFile(outputPath + '.map', result.map.toString());
  }

  console.log(`✓ CSS built to ${outputPath}`);
}

async function main() {
  try {
    await buildCSS();

    if (watchMode) {
      const inputPath = path.join(process.cwd(), 'src/styles/globals.css');
      const configPath = path.join(process.cwd(), 'tailwind.config.js');
      const contentDir = path.join(process.cwd(), 'src');

      console.log('👀 Watching for CSS changes...');

      const watcher = watch(
        [inputPath, configPath, contentDir],
        { recursive: true },
        async (eventType, filename) => {
          if (filename && (filename.endsWith('.css') || filename.endsWith('.html') || filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
            try {
              await buildCSS();
            } catch (err) {
              console.error('Error building CSS:', err.message);
            }
          }
        }
      );

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n👋 Stopped watching');
        watcher.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error('Error building CSS:', err);
    process.exit(1);
  }
}

main();
