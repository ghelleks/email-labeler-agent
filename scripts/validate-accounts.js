#!/usr/bin/env node
/**
 * Account Configuration Validator
 *
 * This script validates accounts.json against the schema and performs
 * additional safety checks to ensure the configuration is valid.
 */

const fs = require('fs');
const path = require('path');

const ACCOUNTS_FILE = path.join(__dirname, '..', 'accounts.json');
const ACCOUNTS_SCHEMA_FILE = path.join(__dirname, '..', 'accounts.schema.json');

/**
 * Load and parse JSON file safely
 */
function loadJsonFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} not found: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Error parsing ${description}: ${error.message}`);
  }
}

/**
 * Validate script ID format
 */
function validateScriptId(scriptId, accountName) {
  const errors = [];

  if (!scriptId) {
    errors.push(`Account "${accountName}": Script ID is required`);
    return errors;
  }

  if (typeof scriptId !== 'string') {
    errors.push(`Account "${accountName}": Script ID must be a string`);
    return errors;
  }

  if (scriptId.length < 30) {
    errors.push(`Account "${accountName}": Script ID must be at least 30 characters (got ${scriptId.length})`);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(scriptId)) {
    errors.push(`Account "${accountName}": Script ID contains invalid characters (only letters, numbers, underscores, and hyphens allowed)`);
  }

  if (scriptId.includes('YOUR_') || scriptId.includes('_HERE')) {
    errors.push(`Account "${accountName}": Script ID appears to be a placeholder, please set actual script ID`);
  }

  return errors;
}

/**
 * Validate account configuration
 */
function validateAccount(accountName, accountConfig) {
  const errors = [];

  // Check required fields
  if (!accountConfig.scriptId) {
    errors.push(`Account "${accountName}": Missing required field "scriptId"`);
  }

  if (!accountConfig.description) {
    errors.push(`Account "${accountName}": Missing required field "description"`);
  }

  // Validate script ID format
  if (accountConfig.scriptId) {
    errors.push(...validateScriptId(accountConfig.scriptId, accountName));
  }

  // Validate description
  if (accountConfig.description && typeof accountConfig.description !== 'string') {
    errors.push(`Account "${accountName}": Description must be a string`);
  }

  return errors;
}

/**
 * Check for duplicate script IDs
 */
function checkForDuplicateScriptIds(accounts) {
  const errors = [];
  const scriptIdMap = new Map();

  Object.entries(accounts).forEach(([accountName, config]) => {
    const scriptId = config.scriptId;
    if (scriptIdMap.has(scriptId)) {
      errors.push(`Duplicate script ID "${scriptId}" found in accounts "${scriptIdMap.get(scriptId)}" and "${accountName}"`);
    } else {
      scriptIdMap.set(scriptId, accountName);
    }
  });

  return errors;
}

/**
 * Validate entire accounts configuration
 */
function validateAccountsConfig(config) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!config.accounts || typeof config.accounts !== 'object') {
    errors.push('Missing or invalid "accounts" object');
    return { errors, warnings };
  }

  if (!config.defaultAccount) {
    warnings.push('No default account specified');
  }

  // Validate each account
  Object.entries(config.accounts).forEach(([accountName, accountConfig]) => {
    errors.push(...validateAccount(accountName, accountConfig));
  });

  // Check for duplicate script IDs
  errors.push(...checkForDuplicateScriptIds(config.accounts));

  // Validate default account exists
  if (config.defaultAccount && !config.accounts[config.defaultAccount]) {
    errors.push(`Default account "${config.defaultAccount}" does not exist in accounts list`);
  }

  // Check account names
  Object.keys(config.accounts).forEach(accountName => {
    if (!/^[a-zA-Z0-9_-]+$/.test(accountName)) {
      errors.push(`Account name "${accountName}" contains invalid characters (only letters, numbers, underscores, and hyphens allowed)`);
    }
  });

  // Warn if no accounts configured
  if (Object.keys(config.accounts).length === 0) {
    warnings.push('No accounts configured');
  }

  return { errors, warnings };
}

/**
 * Basic JSON schema validation (simplified)
 */
function validateBasicSchema(config) {
  const errors = [];

  if (typeof config !== 'object' || config === null) {
    errors.push('Configuration must be a JSON object');
    return errors;
  }

  if (!config.hasOwnProperty('accounts')) {
    errors.push('Missing required property "accounts"');
  }

  if (!config.hasOwnProperty('defaultAccount')) {
    errors.push('Missing required property "defaultAccount"');
  }

  return errors;
}

/**
 * Perform full validation
 */
function validateConfiguration() {
  console.log('🔍 Validating accounts configuration...\n');

  try {
    // Load configuration
    const config = loadJsonFile(ACCOUNTS_FILE, 'accounts.json');

    // Basic schema validation
    const schemaErrors = validateBasicSchema(config);
    if (schemaErrors.length > 0) {
      console.log('❌ Schema Validation Errors:');
      schemaErrors.forEach(error => console.log(`   • ${error}`));
      return false;
    }

    // Detailed validation
    const { errors, warnings } = validateAccountsConfig(config);

    // Report results
    if (errors.length > 0) {
      console.log('❌ Validation Errors:');
      errors.forEach(error => console.log(`   • ${error}`));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
      console.log('');
    }

    if (errors.length === 0) {
      console.log('✅ Configuration is valid!');

      // Show summary
      const accountCount = Object.keys(config.accounts).length;
      console.log(`📊 Summary:`);
      console.log(`   • ${accountCount} account(s) configured`);
      console.log(`   • Default account: ${config.defaultAccount || 'none'}`);

      if (accountCount > 0) {
        console.log(`   • Accounts: ${Object.keys(config.accounts).join(', ')}`);
      }

      return true;
    } else {
      console.log(`❌ Found ${errors.length} error(s). Please fix them before using multi-account features.`);
      return false;
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

/**
 * Generate accounts.json from template if it doesn't exist
 */
function initializeConfiguration() {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    console.log('❌ accounts.json already exists. Use "npm run setup:account" to modify it.');
    return false;
  }

  const templateFile = path.join(__dirname, '..', 'accounts.template.json');
  if (!fs.existsSync(templateFile)) {
    console.log('❌ accounts.template.json not found. Cannot initialize configuration.');
    return false;
  }

  try {
    fs.copyFileSync(templateFile, ACCOUNTS_FILE);
    console.log('✅ Created accounts.json from template');
    console.log('📝 Please edit accounts.json with your actual script IDs and account details');
    console.log('💡 You can also use "npm run setup:account" for interactive setup');
    return true;
  } catch (error) {
    console.error('❌ Error creating accounts.json:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--init')) {
    initializeConfiguration();
  } else if (args.includes('--help')) {
    console.log('Account Configuration Validator');
    console.log('');
    console.log('Usage:');
    console.log('  npm run validate:accounts        Validate existing accounts.json');
    console.log('  npm run validate:accounts --init Initialize accounts.json from template');
    console.log('  npm run validate:accounts --help Show this help');
  } else {
    const isValid = validateConfiguration();
    process.exit(isValid ? 0 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateConfiguration,
  validateAccount,
  validateScriptId,
  checkForDuplicateScriptIds
};