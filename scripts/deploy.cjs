const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ No ETH balance. Get free test ETH from a faucet.");
    process.exit(1);
  }

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ AgentRegistry deployed to:", address);
  console.log("\n📋 Add this to your .env.local:");
  console.log(`VITE_IDENTITY_REGISTRY=${address}`);
  console.log("\nView on explorer:");
  console.log(`https://sepolia.basescan.org/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
