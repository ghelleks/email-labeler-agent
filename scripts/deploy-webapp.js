#!/usr/bin/env node

/**
 * Smart web app deployment script that updates existing deployments
 * instead of creating new ones, maintaining consistent URLs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use accounts.json for all configuration including deployment IDs
const ACCOUNTS_CONFIG_FILE = path.join(__dirname, '..', 'accounts.json');

function getAccountConfig() {
  if (!fs.existsSync(ACCOUNTS_CONFIG_FILE)) {
    throw new Error('accounts.json not found. Run: npm run setup:account');
  }
  return JSON.parse(fs.readFileSync(ACCOUNTS_CONFIG_FILE, 'utf8'));
}

function saveAccountConfig(config) {
  fs.writeFileSync(ACCOUNTS_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function execCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return output.trim();
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    throw error;
  }
}

function getDeployments(account) {
  const command = `clasp --user ${account} --project .clasp.json.${account} deployments`;
  const output = execCommand(command, `Getting deployments for ${account}`);

  // Parse deployment list to find web app deployments
  const lines = output.split('\n').filter(line => line.trim().startsWith('-'));
  const deployments = lines.map(line => {
    const match = line.match(/- (\S+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  return deployments;
}

function findWebAppDeployment(account) {
  const deployments = getDeployments(account);

  // The @HEAD deployment is typically the web app
  const headDeployment = deployments.find(d => d.includes('@HEAD'));
  if (headDeployment) {
    return headDeployment.replace('@HEAD', '').trim();
  }

  // If no @HEAD, try to find the most recent non-versioned deployment
  return deployments[0]?.replace(/@\d+.*/, '').trim();
}

function deployToAccount(account) {
  console.log(`\n📦 Deploying to ${account} account...`);

  const config = getAccountConfig();

  // Step 1: Push latest code
  execCommand(
    `clasp --user ${account} --project .clasp.json.${account} push --force`,
    `Pushing code to ${account}`
  );

  // Step 2: Create version
  const versionOutput = execCommand(
    `clasp --user ${account} --project .clasp.json.${account} version "Auto-deployment $(date)"`,
    `Creating version for ${account}`
  );

  const versionMatch = versionOutput.match(/Created version (\d+)/);
  const versionNumber = versionMatch ? versionMatch[1] : 'HEAD';

  // Step 3: Deploy or redeploy
  let deploymentId = config.accounts[account]?.webAppDeploymentId;

  if (deploymentId) {
    // Redeploy to existing deployment
    console.log(`♻️  Updating existing web app deployment: ${deploymentId}`);
    execCommand(
      `clasp --user ${account} --project .clasp.json.${account} redeploy ${deploymentId} ${versionNumber} "Auto-update $(date)"`,
      `Redeploying to existing deployment for ${account}`
    );
  } else {
    // Try to find existing web app deployment
    deploymentId = findWebAppDeployment(account);

    if (deploymentId) {
      console.log(`🔍 Found existing web app deployment: ${deploymentId}`);
      // Save for future use
      config.accounts[account].webAppDeploymentId = deploymentId;
      saveAccountConfig(config);

      // Redeploy to it
      execCommand(
        `clasp --user ${account} --project .clasp.json.${account} redeploy ${deploymentId} ${versionNumber} "Auto-update $(date)"`,
        `Redeploying to found deployment for ${account}`
      );
    } else {
      // Create new web app deployment
      console.log(`🆕 Creating new web app deployment for ${account}`);
      const deployOutput = execCommand(
        `clasp --user ${account} --project .clasp.json.${account} deploy ${versionNumber} "Initial web app deployment"`,
        `Creating new deployment for ${account}`
      );

      // Extract deployment ID from output
      const deployMatch = deployOutput.match(/Created deployment (.+)/);
      if (deployMatch) {
        deploymentId = deployMatch[1].trim();
        config.accounts[account].webAppDeploymentId = deploymentId;
        saveAccountConfig(config);
        console.log(`💾 Saved deployment ID: ${deploymentId}`);
      }
    }
  }

  // Step 4: Install triggers (best effort)
  try {
    execCommand(
      `clasp --user ${account} --project .clasp.json.${account} run installTrigger`,
      `Installing triggers for ${account}`
    );
    console.log(`✅ Triggers installed successfully`);
  } catch (error) {
    console.log(`\n⚠️  Trigger installation failed (this is common due to permissions)`);
    console.log(`   Manual trigger installation required:`);
    console.log(`   1. Run: npm run open:${account}`);
    console.log(`   2. Select 'installTrigger' function and click Run`);
  }

  // Step 5: Get web app URL
  try {
    const urlOutput = execCommand(
      `clasp --user ${account} --project .clasp.json.${account} run getWebAppUrl`,
      `Getting web app URL for ${account}`
    );
    console.log(`\n🌐 Web app URL for ${account}:`);
    console.log(urlOutput);
  } catch (error) {
    console.log(`\n⚠️  Could not retrieve web app URL for ${account}. You can get it manually with: npm run url:${account}`);
  }

  console.log(`\n✅ Successfully deployed to ${account}!`);
}

function main() {
  const args = process.argv.slice(2);
  const account = args[0];

  if (!account) {
    console.log('\n📱 Smart Web App Deployment');
    console.log('Usage: node deploy-webapp.js <account>');
    console.log('       node deploy-webapp.js all');
    console.log('\nAvailable accounts:');

    try {
      const config = getAccountConfig();
      Object.keys(config.accounts).forEach(acc => {
        console.log(`  - ${acc}`);
      });
    } catch (error) {
      console.log('  Run: npm run setup:account');
    }
    return;
  }

  try {
    if (account === 'all') {
      const config = getAccountConfig();
      for (const acc of Object.keys(config.accounts)) {
        deployToAccount(acc);
      }
    } else {
      deployToAccount(account);
    }
  } catch (error) {
    console.error(`\n❌ Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}