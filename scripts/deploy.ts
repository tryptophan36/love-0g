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

  const AgenticID = await ethers.getContractFactory("AgenticID");
  const agenticId = await AgenticID.deploy("Agentic ID", "AID", 0);
  await agenticId.waitForDeployment();

  const address = await agenticId.getAddress();
  console.log("AgenticID deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
