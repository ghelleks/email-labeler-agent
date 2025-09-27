#!/usr/bin/env node
/**
 * Account Project File Management for Google Apps Script Multi-Account Deployment
 *
 * This script manages project files (.clasp.json.{accountName}) for use with
 * clasp's native --user and --project flags. No more complex authentication switching!
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ACCOUNTS_FILE = path.join(__dirname, '..', 'accounts.json');

/**
 * Load accounts configuration
 */
function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error('❌ No accounts configuration found!');
    console.log('💡 Run "npm run setup:account" to configure accounts first');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading accounts.json:', error.message);
    process.exit(1);
  }
}

/**
 * Generate project file name for an account
 */
function getProjectFile(accountName) {
  return `.clasp.json.${accountName}`;
}

/**
 * Generate clasp configuration for an account
 */
function generateClaspConfig(accountConfig) {
  return {
    scriptId: accountConfig.scriptId,
    rootDir: "src",
    scriptExtensions: [".js", ".gs"],
    htmlExtensions: [".html"],
    jsonExtensions: [".json"],
    filePushOrder: [],
    skipSubdirectories: false
  };
}

/**
 * Create or update project file for an account
 */
function createProjectFile(accountName, accountConfig) {
  const projectFile = getProjectFile(accountName);
  const config = generateClaspConfig(accountConfig);

  try {
    fs.writeFileSync(projectFile, JSON.stringify(config, null, 2));
    console.log(`✅ Created project file: ${projectFile}`);
  } catch (error) {
    console.error(`❌ Error creating ${projectFile}:`, error.message);
    process.exit(1);
  }
}

/**
 * Show current account status
 */
function showStatus() {
  console.log('📋 Multi-Account Project Files Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.log('❌ No accounts configured. Run "npm run setup:account" first.');
    return;
  }

  const accounts = loadAccounts();
  const accountNames = Object.keys(accounts.accounts);

  console.log(`\n📊 Configured Accounts: ${accountNames.length}`);
  console.log(`⭐ Default Account: ${accounts.defaultAccount}`);

  // Show all accounts
  console.log('\n📧 Account Details:');
  accountNames.forEach(accountName => {
    const config = accounts.accounts[accountName];
    const projectFile = getProjectFile(accountName);
    const hasProjectFile = fs.existsSync(projectFile);
    const isDefault = accountName === accounts.defaultAccount ? ' (default)' : '';

    console.log(`   • ${accountName}${isDefault}: ${config.description}`);
    console.log(`     Script ID: ${config.scriptId}`);
    console.log(`     Project File: ${projectFile} ${hasProjectFile ? '✅' : '❌'}`);

    // Check user authentication using clasp's native --user flag
    try {
      execSync(`clasp --user ${accountName} show-authorized-user`, { stdio: 'pipe' });
      console.log(`     Authentication: ✅ Logged in`);
    } catch (error) {
      console.log(`     Authentication: ❌ Not logged in (run: clasp --user ${accountName} login)`);
    }
  });

  console.log('\n💡 Usage Examples:');
  console.log('   npm run push:personal          - Push to personal account');
  console.log('   npm run deploy:work:all        - Full deployment to work account');
  console.log('   npm run status:all             - Check all accounts');
  console.log('   npm run setup:account          - Add/modify accounts');
}


/**
 * Ensure all accounts have project files
 */
function createAllProjectFiles() {
  const accounts = loadAccounts();

  console.log('🔄 Creating project files for all accounts...');

  Object.entries(accounts.accounts).forEach(([accountName, accountConfig]) => {
    createProjectFile(accountName, accountConfig);
  });

  console.log('✅ All project files created');
  console.log('\n💡 You can now use commands like:');
  console.log(`   npm run push:${Object.keys(accounts.accounts)[0]}`);
  console.log(`   npm run deploy:${Object.keys(accounts.accounts)[0]}:all`);
}

/**
 * Main execution logic
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showStatus();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'status':
      showStatus();
      break;

    case 'create-project-files':
      createAllProjectFiles();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\n💡 Available commands:');
      console.log('   status                 - Show account status');
      console.log('   create-project-files   - Create all project files');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadAccounts,
  getProjectFile,
  createProjectFile,
  showStatus,
  createAllProjectFiles,
  generateClaspConfig
};