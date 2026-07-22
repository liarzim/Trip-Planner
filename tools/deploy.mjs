import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read .deployrc.json
const deployRcPath = path.join(rootDir, '.deployrc.json');
if (!fs.existsSync(deployRcPath)) {
  console.error(`Error: .deployrc.json not found at ${deployRcPath}`);
  process.exit(1);
}

const deployRc = JSON.parse(fs.readFileSync(deployRcPath, 'utf8'));

// Allow ENV overrides
const account = process.env.FIREBASE_DEPLOY_ACCOUNT || deployRc.account;
const project = process.env.FIREBASE_DEPLOY_PROJECT || deployRc.project;

console.log(`[deploy.mjs] Target Account: ${account}`);
console.log(`[deploy.mjs] Target Project: ${project}`);

// 2. BEFORE deploying, verify account has access to project
console.log(`[deploy.mjs] Verifying project access for account ${account}...`);

let projectListOutput = '';
try {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const res = spawnSync(cmd, ['firebase', 'projects:list', '--account', account, '--json'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: true
  });
  projectListOutput = (res.stdout || '') + (res.stderr || '');
} catch (e) {
  projectListOutput = (e.stdout || '') + (e.stderr || '') + (e.message || '');
}

// Judge strictly by whether PROJECT_ID appears in the output text, NOT by exit code
if (!projectListOutput.includes(project)) {
  console.error(`\nRefusing to deploy: Project "${project}" was not found in projects list for account "${account}".`);
  console.error(`Please run "npx firebase login:add" to authenticate account "${account}" and try again.`);
  process.exit(1);
}

console.log(`[deploy.mjs] Access OK: Project "${project}" verified in projects list for account "${account}".`);

// 3. Process arguments and dry-run flag
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const filteredArgs = args.filter(a => a !== '--dry-run');

// Check build step / config for functions if specified in .deployrc.json
let configFile = 'firebase.json';
const isFunctionsTarget = filteredArgs.includes('functions') || filteredArgs.some(a => a.startsWith('functions:'));

if (deployRc.bundle && isFunctionsTarget) {
  if (deployRc.bundle.command && Array.isArray(deployRc.bundle.command)) {
    console.log(`[deploy.mjs] Running build step: ${deployRc.bundle.command.join(' ')}`);
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `${deployRc.bundle.command[0]}.cmd` : deployRc.bundle.command[0];
    const buildRes = spawnSync(cmd, deployRc.bundle.command.slice(1), {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    if (buildRes.status !== 0) {
      console.error('[deploy.mjs] Build step failed.');
      process.exit(buildRes.status || 1);
    }
  }
  if (deployRc.bundle.config) {
    configFile = deployRc.bundle.config;
  }
}

if (isDryRun) {
  console.log(`[deploy.mjs] [DRY RUN] Access OK verified. Interrupted before actual deploy execution.`);
  process.exit(0);
}

// 4. Run firebase deploy pinning --account, --project, --config, --non-interactive
const deployArgs = [
  'firebase',
  'deploy',
  ...filteredArgs,
  '--project', project,
  '--account', account,
  '--config', configFile,
  '--non-interactive'
];

console.log(`[deploy.mjs] Executing deploy: npx ${deployArgs.join(' ')}`);
const isWin = process.platform === 'win32';
const cmd = isWin ? 'npx.cmd' : 'npx';
const deployRes = spawnSync(cmd, deployArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

process.exit(deployRes.status || 0);
