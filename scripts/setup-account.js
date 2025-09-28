#!/usr/bin/env node
/**
 * Interactive Account Setup for Google Apps Script Multi-Account Deployment
 *
 * This script provides an interactive wizard to configure accounts for
 * the new native clasp --user and --project flag system.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ACCOUNTS_FILE = path.join(__dirname, '..', 'accounts.json');
const ACCOUNTS_TEMPLATE_FILE = path.join(__dirname, 'accounts.template.json');

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Promisified question function
 */
function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

/**
 * Validate script ID format
 */
function validateScriptId(scriptId) {
  if (!scriptId || scriptId.length < 30) {
    return 'Script ID must be at least 30 characters long';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(scriptId)) {
    return 'Script ID can only contain letters, numbers, underscores, and hyphens';
  }
  return null;
}

/**
 * Load existing accounts or create new structure
 */
function loadOrCreateAccounts() {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error reading existing accounts.json:', error.message);
      console.log('Creating backup and starting fresh...');
      fs.copyFileSync(ACCOUNTS_FILE, ACCOUNTS_FILE + '.backup');
    }
  }

  // Load template or create minimal structure
  if (fs.existsSync(ACCOUNTS_TEMPLATE_FILE)) {
    try {
      const template = fs.readFileSync(ACCOUNTS_TEMPLATE_FILE, 'utf8');
      const config = JSON.parse(template);
      // Clear template accounts
      config.accounts = {};
      return config;
    } catch (error) {
      console.log('Template file exists but has issues, creating minimal structure...');
    }
  }

  return {
    defaultAccount: '',
    accounts: {}
  };
}

/**
 * Save accounts configuration
 */
function saveAccounts(accounts) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    console.log('✅ Accounts configuration saved');
  } catch (error) {
    console.error('❌ Error saving accounts.json:', error.message);
    process.exit(1);
  }
}

/**
 * Interactive account creation
 */
async function createNewAccount(rl, accounts) {
  console.log('\n🆕 Adding New Account');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Account name (required)
  let accountName = '';
  while (!accountName.trim()) {
    accountName = await question(rl, '\n📝 Account name (REQUIRED - e.g., "personal", "work"): ');
    if (!accountName.trim()) {
      console.log('❌ Account name is required. Please enter a name like "personal" or "work".');
    }
  }

  if (accounts.accounts[accountName]) {
    console.log(`❌ Account "${accountName}" already exists`);
    return accounts;
  }

  // Account description (optional)
  console.log('\n💬 Account description helps you remember what this account is for.');
  const description = await question(rl, `   Description (optional - e.g., "Personal Gmail account"): `);

  // Google Apps Script project setup
  console.log('\n🔧 Google Apps Script Project Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 You need a Google Apps Script project for this account.');
  console.log('\n🔍 How to find your Script ID:');
  console.log('   1. Go to https://script.google.com');
  console.log('   2. Create a new project or open an existing one');
  console.log('   3. Copy the ID from the URL: script.google.com/d/{SCRIPT_ID}/edit');
  console.log('   4. The Script ID is about 40+ characters long');

  let scriptId = '';
  while (true) {
    scriptId = await question(rl, '\n🆔 Enter your Google Apps Script project ID (REQUIRED): ');
    if (!scriptId.trim()) {
      console.log('❌ Script ID is required. Please enter the ID from your Apps Script project URL.');
      continue;
    }

    const error = validateScriptId(scriptId);
    if (!error) break;
    console.log(`❌ ${error}`);
    console.log('💡 Make sure you copied the full Script ID from the Apps Script project URL.');
  }

  // Create account configuration
  accounts.accounts[accountName] = {
    scriptId: scriptId.trim(),
    description: description.trim() || `${accountName.charAt(0).toUpperCase() + accountName.slice(1)} account`
  };

  // Set as default if it's the first account
  if (!accounts.defaultAccount || Object.keys(accounts.accounts).length === 1) {
    accounts.defaultAccount = accountName;
    console.log(`\n⭐ Set "${accountName}" as your default account`);
  }

  console.log(`\n✅ Successfully configured "${accountName}" account!`);
  console.log(`📧 Description: ${accounts.accounts[accountName].description}`);
  console.log(`🆔 Script ID: ${scriptId}`);

  console.log('\n💡 Next steps:');
  console.log(`   1. Log into the Google account for "${accountName}": clasp --user ${accountName} login`);
  console.log(`   2. Create project file: npm run switch:create-project-files`);
  console.log(`   3. Start using: npm run push:${accountName}`);

  return accounts;
}

/**
 * Show accounts summary
 */
function showAccountsSummary(accounts) {
  console.log('\n📋 Account Configuration Summary:');
  console.log(`   Default Account: ${accounts.defaultAccount}`);
  console.log('   Configured Accounts:');

  Object.entries(accounts.accounts).forEach(([name, config]) => {
    const isDefault = name === accounts.defaultAccount ? ' (default)' : '';
    console.log(`     • ${name}${isDefault}: ${config.description}`);
    console.log(`       Script ID: ${config.scriptId}`);
  });
}

/**
 * Main setup wizard
 */
async function runSetupWizard() {
  const rl = createReadlineInterface();

  console.log('🚀 Email Agent Multi-Account Setup Wizard');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('\n📋 This wizard helps you manage multiple Google accounts for email automation.');
  console.log('\n💡 What this does:');
  console.log('   • Lets you deploy to different Gmail accounts (personal, work, etc.)');
  console.log('   • Uses clasp native --user flags for clean account management');
  console.log('   • Each account gets its own project file');
  console.log('\n🔧 What you will need:');
  console.log('   • Access to your Google account(s)');
  console.log('   • Google Apps Script project ID(s)');
  console.log('\n⚡ Fields marked as (REQUIRED) are mandatory');
  console.log('   Fields marked as (optional) can be left blank');

  try {
    let accounts = loadOrCreateAccounts();

    // Interactive menu
    while (true) {
      console.log('\n🔧 What would you like to do?');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('1. 🆕 Add new account');
      console.log('2. 📋 Show current configuration');
      console.log('3. ⭐ Set default account');
      console.log('4. 🗑️  Remove account');
      console.log('5. ✅ Save and exit');
      console.log('6. ❌ Exit without saving');

      const choice = await question(rl, '\nEnter your choice (1-6): ');

      switch (choice.trim()) {
        case '1':
          accounts = await createNewAccount(rl, accounts);
          break;

        case '2':
          if (Object.keys(accounts.accounts).length === 0) {
            console.log('\n❌ No accounts configured yet');
          } else {
            showAccountsSummary(accounts);
          }
          break;

        case '3':
          if (Object.keys(accounts.accounts).length === 0) {
            console.log('\n❌ No accounts configured yet');
            break;
          }
          console.log('\nAvailable accounts:');
          Object.keys(accounts.accounts).forEach((name, index) => {
            console.log(`  ${index + 1}. ${name}`);
          });
          const defaultChoice = await question(rl, 'Enter account name to set as default: ');
          if (accounts.accounts[defaultChoice.trim()]) {
            accounts.defaultAccount = defaultChoice.trim();
            console.log(`✅ Set "${defaultChoice.trim()}" as default account`);
          } else {
            console.log('❌ Invalid account name');
          }
          break;

        case '4':
          if (Object.keys(accounts.accounts).length === 0) {
            console.log('\n❌ No accounts configured yet');
            break;
          }
          console.log('\nConfigured accounts:');
          Object.keys(accounts.accounts).forEach((name, index) => {
            console.log(`  ${index + 1}. ${name}`);
          });
          const removeChoice = await question(rl, 'Enter account name to remove: ');
          if (accounts.accounts[removeChoice.trim()]) {
            delete accounts.accounts[removeChoice.trim()];
            // Reset default if removed
            if (accounts.defaultAccount === removeChoice.trim()) {
              const remaining = Object.keys(accounts.accounts);
              accounts.defaultAccount = remaining.length > 0 ? remaining[0] : '';
            }
            console.log(`✅ Removed account "${removeChoice.trim()}"`);
          } else {
            console.log('❌ Invalid account name');
          }
          break;

        case '5':
          if (Object.keys(accounts.accounts).length === 0) {
            console.log('\n❌ Cannot save: No accounts configured yet');
            console.log('💡 Please add at least one account before saving (option 1).');
            break;
          }
          saveAccounts(accounts);
          showAccountsSummary(accounts);
          console.log('\n🎉 Multi-account setup complete!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('\n🚀 Final setup steps:');
          console.log('   1. Create project files: npm run switch:create-project-files');
          console.log('   2. Log into each account:');
          Object.keys(accounts.accounts).forEach(accountName => {
            console.log(`      clasp --user ${accountName} login`);
          });
          console.log('\n🔄 Ready to use commands:');
          console.log('   npm run deploy:personal        - Complete deployment to specific account');
          console.log('   npm run deploy:work            - Complete deployment to specific account');
          console.log('   npm run status:all             - Check all accounts');
          console.log('\n💡 The new system uses clasp native --user flags - much cleaner!');
          rl.close();
          return;

        case '6':
          console.log('\n👋 Exiting without saving changes');
          rl.close();
          return;

        default:
          console.log('❌ Invalid choice, please enter 1-6');
      }
    }

  } catch (error) {
    console.error('❌ Setup wizard error:', error.message);
    rl.close();
    process.exit(1);
  }
}

if (require.main === module) {
  runSetupWizard();
}

module.exports = { runSetupWizard, loadOrCreateAccounts, saveAccounts };