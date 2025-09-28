#!/usr/bin/env node
/**
 * Multi-Account Operations for Google Apps Script Deployment
 *
 * Simple wrapper around native clasp --user and --project flags.
 * Clasp handles authentication automatically - no complex logic needed!
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { loadAccounts, getProjectFile, createProjectFile } = require('./switch-account.js');

/**
 * Execute a clasp command for a specific account using native flags
 */
async function executeForAccount(accountName, baseCommand, description) {
  console.log(`\n🔄 ${description} for account: ${accountName}`);

  try {
    const accounts = loadAccounts();
    const accountConfig = accounts.accounts[accountName];

    if (!accountConfig) {
      throw new Error(`Account "${accountName}" not found in configuration`);
    }

    const projectFile = getProjectFile(accountName);

    // Ensure project file exists
    if (!fs.existsSync(projectFile)) {
      createProjectFile(accountName, accountConfig);
    }

    // Build and execute the command - clasp handles auth automatically
    const command = `clasp --user ${accountName} --project ${projectFile} ${baseCommand}`;

    console.log(`   Running: ${command}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ Success for ${accountName}`);

    if (result.trim()) {
      console.log('   Output:', result.trim());
    }

    return { success: true, output: result, account: accountName };
  } catch (error) {
    console.error(`❌ Failed for ${accountName}:`, error.message);

    // Simple guidance for common issues
    if (error.message.includes('not logged in') || error.message.includes('unauthorized')) {
      console.log(`💡 Run: clasp --user ${accountName} login`);
    }

    return { success: false, error: error.message, account: accountName };
  }
}

/**
 * Execute command for all configured accounts
 */
async function executeForAllAccounts(baseCommand, description, options = {}) {
  const accounts = loadAccounts();
  const accountNames = Object.keys(accounts.accounts);

  if (accountNames.length === 0) {
    console.log('❌ No accounts configured. Run "npm run setup:account" first.');
    process.exit(1);
  }

  console.log(`🚀 ${description} for ${accountNames.length} account(s):`);
  accountNames.forEach(name => console.log(`   • ${name}: ${accounts.accounts[name].description}`));

  // Confirmation prompt for destructive operations
  if (options.requireConfirmation) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question('\nAre you sure you want to proceed? (y/N): ', async answer => {
        rl.close();
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('Operation cancelled');
          process.exit(0);
        }

        const results = await runForAllAccounts(accountNames, baseCommand, description, options);
        resolve(results);
      });
    });
  }

  return await runForAllAccounts(accountNames, baseCommand, description, options);
}

/**
 * Helper to run command for all accounts
 */
async function runForAllAccounts(accountNames, baseCommand, description, options = {}) {
  const results = [];

  for (const accountName of accountNames) {
    if (options.isPushDeploy) {
      // Handle push+deploy as two separate sequential operations
      console.log(`\n🔄 Full deployment for account: ${accountName}`);

      // Push first
      const pushResult = await executeForAccount(accountName, 'push', 'Pushing code');
      if (!pushResult.success) {
        results.push(pushResult);
        continue; // Skip deploy if push failed
      }

      // Deploy second
      const deployResult = await executeForAccount(accountName, 'deploy --description "Production deployment $(date)"', 'Deploying');
      results.push(deployResult);
    } else {
      const result = await executeForAccount(accountName, baseCommand, description);
      results.push(result);
    }
  }

  // Show summary
  console.log('\n📊 Multi-Account Operation Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => console.log(`   • ${r.account}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => console.log(`   • ${r.account}: ${r.error}`));
  }

  return results;
}

/**
 * Show status for all accounts
 */
function showAllAccountsStatus() {
  const accounts = loadAccounts();
  const accountNames = Object.keys(accounts.accounts);

  if (accountNames.length === 0) {
    console.log('❌ No accounts configured. Run "npm run setup:account" first.');
    return;
  }

  console.log('📋 Multi-Account Status Report:');
  console.log('================================\n');

  accountNames.forEach(accountName => {
    console.log(`📧 ${accountName}: ${accounts.accounts[accountName].description}`);
    console.log(`   Script ID: ${accounts.accounts[accountName].scriptId}`);
    console.log(`   Project File: ${getProjectFile(accountName)}`);

    try {
      // Simple auth check - let clasp tell us
      execSync(`clasp --user ${accountName} show-authorized-user`, { stdio: 'pipe' });
      console.log(`   Authentication: ✅ Logged in`);
    } catch (error) {
      console.log(`   Authentication: ❌ Not logged in (run: clasp --user ${accountName} login)`);
    }

    try {
      const projectFile = getProjectFile(accountName);
      if (fs.existsSync(projectFile)) {
        const status = execSync(`clasp --user ${accountName} --project ${projectFile} status`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        console.log(`   Status: ${status.trim()}`);
      } else {
        console.log(`   Status: ❌ Project file missing (run: npm run switch:create-project-files)`);
      }
    } catch (error) {
      console.log(`   Status: ❌ ${error.message}`);
    }
    console.log('');
  });
}

/**
 * Handle account-specific operations
 */
async function handleAccountOperation(operation, accountName) {
  const accounts = loadAccounts();

  if (!accounts.accounts[accountName]) {
    console.error(`❌ Account "${accountName}" not found!`);
    console.log('Available accounts:', Object.keys(accounts.accounts).join(', '));
    process.exit(1);
  }

  let baseCommand;
  let description;

  switch (operation) {
    case 'push':
      baseCommand = 'push';
      description = 'Pushing code';
      break;

    case 'pull':
      baseCommand = 'pull';
      description = 'Pulling code';
      break;

    case 'deploy':
      baseCommand = 'deploy --description "Production deployment $(date)"';
      description = 'Deploying';
      break;

    case 'logs':
      baseCommand = 'logs';
      description = 'Viewing logs';
      break;

    case 'status':
      baseCommand = 'status';
      description = 'Checking status';
      break;

    case 'open':
      baseCommand = 'open-script';
      description = 'Opening Apps Script editor';
      break;

    default:
      console.error(`❌ Unknown operation: ${operation}`);
      process.exit(1);
  }

  return await executeForAccount(accountName, baseCommand, description);
}

/**
 * Main execution logic
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Multi-Account Operations using native clasp --user and --project flags:');
    console.log('  npm run status:all              Show status for all accounts');
    console.log('  npm run deploy:all              Deploy to all accounts');
    console.log('');
    console.log('💡 Individual account operations available via npm scripts:');
    console.log('  npm run deploy:personal         npm run deploy:work');
    console.log('');
    return;
  }

  const [operation, target] = args;

  switch (operation) {
    case 'status-all':
      showAllAccountsStatus();
      break;

    case 'deploy-all':
      await executeForAllAccounts('deploy', 'Deploying with full push+deploy cycle', {
        requireConfirmation: true,
        isPushDeploy: true
      });
      break;

    case 'push-all':
      await executeForAllAccounts('push', 'Pushing code');
      break;


    case 'account-operation':
      if (!target) {
        console.error('❌ Account name required for account-specific operations');
        process.exit(1);
      }
      const [accountOp, accountName] = target.split(':');
      await handleAccountOperation(accountOp, accountName);
      break;

    default:
      console.error(`❌ Unknown operation: ${operation}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  executeForAccount,
  executeForAllAccounts,
  showAllAccountsStatus,
  handleAccountOperation
};