import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "0G");

  if (balance === BigInt(0)) {
    console.error("No balance! Get testnet tokens from https://faucet.0g.ai");
    process.exit(1);
  }

  // Deploy AgenticID (ERC-7857 iNFT)
  console.log("\n--- Deploying AgenticID ---");
  const AgenticID = await ethers.getContractFactory("AgenticID");
  const agenticId = await AgenticID.deploy("Agentic ID", "AID", 0);
  await agenticId.waitForDeployment();
  const agenticIdAddress = await agenticId.getAddress();
  console.log("AgenticID deployed to:", agenticIdAddress);

  // Deploy Reputation
  console.log("\n--- Deploying Reputation ---");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("Reputation deployed to:", reputationAddress);

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log("\nAdd these to your .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${agenticIdAddress}`);
  console.log(`NEXT_PUBLIC_INFT_CONTRACT=${agenticIdAddress}`);
  console.log(`INFT_CONTRACT=${agenticIdAddress}`);
  console.log(`REPUTATION_CONTRACT=${reputationAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_CONTRACT=${reputationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
