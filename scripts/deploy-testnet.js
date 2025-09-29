const { ethers } = require("hardhat");

async function main() {
  console.log("🌊 Deploying Blue Carbon Token to Testnet...");
  
  // Get the contract factory
  const BlueCarbonToken = await ethers.getContractFactory("BlueCarbonToken");
  
  // Deploy the contract
  console.log("📝 Deploying contract...");
  const blueCarbonToken = await BlueCarbonToken.deploy();
  
  // Wait for deployment to complete
  await blueCarbonToken.deployed();
  
  console.log("✅ Blue Carbon Token deployed to:", blueCarbonToken.address);
  console.log("🔗 Transaction hash:", blueCarbonToken.deployTransaction.hash);
  
  // Get deployment info
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  console.log("💰 Deployer balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  
  // Verify deployment
  const name = await blueCarbonToken.name();
  const symbol = await blueCarbonToken.symbol();
  const decimals = await blueCarbonToken.decimals();
  const totalSupply = await blueCarbonToken.totalSupply();
  
  console.log("\n📊 Token Information:");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals.toString());
  console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, decimals));
  
  // Add deployer as minter
  console.log("\n🔧 Setting up admin permissions...");
  await blueCarbonToken.addMinter(deployer.address);
  console.log("✅ Deployer added as authorized minter");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: blueCarbonToken.address,
    deployer: deployer.address,
    transactionHash: blueCarbonToken.deployTransaction.hash,
    blockNumber: blueCarbonToken.deployTransaction.blockNumber,
    timestamp: new Date().toISOString(),
    tokenInfo: {
      name,
      symbol,
      decimals: decimals.toString(),
      totalSupply: totalSupply.toString()
    }
  };
  
  // Write to file
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '..', 'deployments', `${hre.network.name}.json`);
  
  // Ensure deployments directory exists
  const deploymentsDir = path.dirname(deploymentFile);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Copy the contract address to your .env file");
  console.log("2. Update your frontend configuration");
  console.log("3. Start minting Blue Carbon tokens!");
  
  return blueCarbonToken;
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
