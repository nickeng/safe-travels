#!/usr/bin/env node
/**
 * Hotels skill - unified search entry point.
 * Searches Booking.com and Agoda in parallel for a location.
 * (Google is now a separate price-comparison tool — use google.mjs directly.)
 *
 * Usage:
 *   node hotels.mjs --location "Shinjuku, Tokyo, Japan" [options]
 *
 * Options: --location, --checkin, --checkout, --adults, --currency,
 *          --price_min, --price_max, --stars, --rating_min, --sort_by,
 *          --property_type, --limit, --platform (booking|agoda|all),
 *          --attribution <dir> (write image attribution JSON, forwarded to each parser)
 */
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Self-bootstrap
if (!existsSync(resolve(__dirname, 'node_modules', 'playwright'))) {
  process.stderr.write('[hotels] Installing playwright (first run)...\n');
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
  process.stderr.write('[hotels] Installing chromium browser...\n');
  execSync('npx playwright install chromium', { cwd: __dirname, stdio: 'inherit' });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) opts[key] = args[++i];
    else opts[key] = true;
  }
  return opts;
}

function runScript(script, opts) {
  return new Promise((resolve) => {
    const args = [];
    for (const [k, v] of Object.entries(opts)) {
      if (k === 'platform') continue;
      if (v === true) args.push(`--${k}`);
      else args.push(`--${k}`, String(v));
    }
    const child = spawn('node', [script, ...args], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', () => resolve(stdout || stderr || 'No output'));
    child.on('error', err => resolve(`Error: ${err.message}`));
  });
}

const opts = parseArgs();
if (!opts.location) {
  console.error('Usage: node hotels.mjs --location "City, Country" [--platform booking|agoda|all]');
  process.exit(1);
}

const platform = (opts.platform || 'all').toLowerCase();
const scripts = { booking: 'booking.mjs', agoda: 'agoda.mjs' };
const toRun = platform === 'all'
  ? Object.entries(scripts)
  : [[platform, scripts[platform]]].filter(([, v]) => v);

if (!toRun.length) {
  console.error(`Unknown platform: ${platform}. Use: booking, agoda, or all`);
  process.exit(1);
}

const results = await Promise.all(toRun.map(([, script]) => runScript(resolve(__dirname, script), opts)));
console.log(results.join('\n'));
