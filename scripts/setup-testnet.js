#!/usr/bin/env node

/**
 * Blue Carbon Token - Testnet Setup Script
 * 
 * This script automates the entire testnet setup process:
 * 1. Checks dependencies
 * 2. Validates environment
 * 3. Deploys contract
 * 4. Updates configuration
 * 5. Provides next steps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.cyan}🔧 Step ${step}: ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function checkDependencies() {
  logStep(1, 'Checking Dependencies');
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      logInfo('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      logSuccess('Dependencies installed');
    } else {
      logSuccess('Dependencies already installed');
    }
    
    // Check if hardhat is installed
    try {
      execSync('npx hardhat --version', { stdio: 'pipe' });
      logSuccess('Hardhat is installed');
    } catch (error) {
      logError('Hardhat not found. Installing...');
      execSync('npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts', { stdio: 'inherit' });
      logSuccess('Hardhat installed');
    }
    
  } catch (error) {
    logError(`Failed to install dependencies: ${error.message}`);
    process.exit(1);
  }
}

async function checkEnvironment() {
  logStep(2, 'Checking Environment');
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    logWarning('.env file not found. Creating template...');
    
    const envTemplate = `# Blue Carbon Token - Testnet Configuration
# NEVER commit this file with real private keys!

# Private Key (NEVER use your main wallet private key!)
PRIVATE_KEY=your_testnet_wallet_private_key_here

# RPC URLs (Get free keys from Infura, Alchemy, etc.)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY

# API Keys (Optional - for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Gas settings
REPORT_GAS=true
`;
    
    fs.writeFileSync('.env', envTemplate);
    logSuccess('.env template created');
    logWarning('Please update .env file with your actual values');
  } else {
    logSuccess('.env file found');
  }
  
  // Check if private key is set
  require('dotenv').config();
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_testnet_wallet_private_key_here') {
    logError('Please set your PRIVATE_KEY in .env file');
    logInfo('You can get a testnet wallet from MetaMask');
    process.exit(1);
  }
  
  logSuccess('Environment configuration looks good');
}

async function selectTestnet() {
  logStep(3, 'Select Testnet');
  
  const testnets = [
    { name: 'Sepolia (Ethereum)', value: 'sepolia', chainId: '11155111' },
    { name: 'Mumbai (Polygon)', value: 'mumbai', chainId: '80001' },
    { name: 'BSC Testnet', value: 'bscTestnet', chainId: '97' },
    { name: 'Avalanche Fuji', value: 'avalancheFuji', chainId: '43113' },
  ];
  
  logInfo('Available testnets:');
  testnets.forEach((testnet, index) => {
    log(`  ${index + 1}. ${testnet.name} (Chain ID: ${testnet.chainId})`, 'blue');
  });
  
  const choice = await askQuestion('\nSelect testnet (1-4): ');
  const selectedIndex = parseInt(choice) - 1;
  
  if (selectedIndex < 0 || selectedIndex >= testnets.length) {
    logError('Invalid selection');
    process.exit(1);
  }
  
  const selectedTestnet = testnets[selectedIndex];
  logSuccess(`Selected: ${selectedTestnet.name}`);
  
  return selectedTestnet;
}

async function deployContract(testnet) {
  logStep(4, 'Deploying Contract');
  
  try {
    logInfo(`Deploying to ${testnet.name}...`);
    
    // Compile contracts first
    logInfo('Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });
    logSuccess('Contracts compiled');
    
    // Deploy contract
    logInfo('Deploying contract...');
    const deployCommand = `npx hardhat run scripts/deploy-testnet.js --network ${testnet.value}`;
    const output = execSync(deployCommand, { encoding: 'utf8' });
    
    // Extract contract address from output
    const addressMatch = output.match(/deployed to: (0x[a-fA-F0-9]{40})/);
    if (addressMatch) {
      const contractAddress = addressMatch[1];
      logSuccess(`Contract deployed to: ${contractAddress}`);
      
      // Save deployment info
      const deploymentInfo = {
        testnet: testnet.name,
        chainId: testnet.chainId,
        contractAddress,
        timestamp: new Date().toISOString(),
        network: testnet.value
      };
      
      const deploymentsDir = path.join(__dirname, '..', 'deployments');
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      const deploymentFile = path.join(deploymentsDir, `${testnet.value}.json`);
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      logSuccess(`Deployment info saved to: ${deploymentFile}`);
      
      return contractAddress;
    } else {
      logError('Could not extract contract address from deployment output');
      return null;
    }
    
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    logInfo('Make sure you have:');
    logInfo('1. Testnet tokens in your wallet');
    logInfo('2. Correct RPC URL in .env file');
    logInfo('3. Valid private key');
    process.exit(1);
  }
}

async function updateConfiguration(contractAddress, testnet) {
  logStep(5, 'Updating Configuration');
  
  try {
    // Update frontend configuration
    const configFile = path.join(__dirname, '..', 'client', 'lib', 'testnetConfig.ts');
    if (fs.existsSync(configFile)) {
      let configContent = fs.readFileSync(configFile, 'utf8');
      
      // Update contract address
      const addressRegex = new RegExp(`(${testnet.value}:\\s*")([^"]*)(")`);
      if (addressRegex.test(configContent)) {
        configContent = configContent.replace(addressRegex, `$1${contractAddress}$3`);
        fs.writeFileSync(configFile, configContent);
        logSuccess('Frontend configuration updated');
      }
    }
    
    // Create environment file for frontend
    const frontendEnv = path.join(__dirname, '..', 'client', '.env.local');
    const envContent = `# Blue Carbon Token - Frontend Configuration
REACT_APP_CONTRACT_ADDRESS=${contractAddress}
REACT_APP_NETWORK=${testnet.value}
REACT_APP_CHAIN_ID=${testnet.chainId}
REACT_APP_NETWORK_NAME=${testnet.name}
`;
    
    fs.writeFileSync(frontendEnv, envContent);
    logSuccess('Frontend environment file created');
    
  } catch (error) {
    logWarning(`Could not update configuration: ${error.message}`);
  }
}

async function showNextSteps(contractAddress, testnet) {
  logStep(6, 'Next Steps');
  
  logSuccess('🎉 Blue Carbon Token deployed successfully!');
  logInfo(`Contract Address: ${contractAddress}`);
  logInfo(`Network: ${testnet.name}`);
  logInfo(`Chain ID: ${testnet.chainId}`);
  
  log('\n📋 Next Steps:', 'bright');
  log('1. Get testnet tokens from faucet:', 'yellow');
  
  const faucets = {
    sepolia: ['https://sepoliafaucet.com/', 'https://faucets.chain.link/sepolia'],
    mumbai: ['https://faucet.polygon.technology/', 'https://mumbaifaucet.com/'],
    bscTestnet: ['https://testnet.bnbchain.org/faucet-smart'],
    avalancheFuji: ['https://faucet.avax.network/']
  };
  
  if (faucets[testnet.value]) {
    faucets[testnet.value].forEach(faucet => {
      log(`   - ${faucet}`, 'blue');
    });
  }
  
  log('\n2. Add network to MetaMask:', 'yellow');
  log(`   - Network Name: ${testnet.name}`, 'blue');
  log(`   - RPC URL: Check your .env file`, 'blue');
  log(`   - Chain ID: ${testnet.chainId}`, 'blue');
  log(`   - Currency Symbol: ${testnet.value === 'sepolia' ? 'ETH' : testnet.value === 'mumbai' ? 'MATIC' : testnet.value === 'bscTestnet' ? 'BNB' : 'AVAX'}`, 'blue');
  
  log('\n3. Start the frontend:', 'yellow');
  log('   cd client && npm start', 'blue');
  
  log('\n4. Test the system:', 'yellow');
  log('   - Connect wallet to testnet', 'blue');
  log('   - Get testnet tokens from faucet', 'blue');
  log('   - Try minting Blue Carbon tokens', 'blue');
  log('   - Test transfers and burning', 'blue');
  
  log('\n🔗 Block Explorer:', 'bright');
  const explorers = {
    sepolia: 'https://sepolia.etherscan.io',
    mumbai: 'https://mumbai.polygonscan.com',
    bscTestnet: 'https://testnet.bscscan.com',
    avalancheFuji: 'https://testnet.snowtrace.io'
  };
  
  if (explorers[testnet.value]) {
    log(`   ${explorers[testnet.value]}/address/${contractAddress}`, 'blue');
  }
  
  log('\n🎯 You now have a fully functional Blue Carbon Token system on testnet!', 'green');
  log('   No real money required - everything is free to use!', 'green');
}

async function main() {
  log('🌊 Blue Carbon Token - Testnet Setup', 'bright');
  log('=====================================', 'bright');
  log('This script will help you deploy Blue Carbon Token on testnet for FREE!', 'cyan');
  
  try {
    await checkDependencies();
    await checkEnvironment();
    const testnet = await selectTestnet();
    const contractAddress = await deployContract(testnet);
    
    if (contractAddress) {
      await updateConfiguration(contractAddress, testnet);
      await showNextSteps(contractAddress, testnet);
    }
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
main();
