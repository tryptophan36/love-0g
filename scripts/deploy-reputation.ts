import hre from "hardhat";

const { ethers } = hre;

/**
 * Deploy only `Reputation.sol` (no constructor args).
 * Uses PRIVATE_KEY and ZG_TESTNET_RPC from `.env` — same as full deploy.
 *
 *   npx hardhat run scripts/deploy-reputation.ts --network zgTestnet
 *
 * Then set REPUTATION_CONTRACT (and NEXT_PUBLIC_REPUTATION_CONTRACT if used) to the printed address.
 */
async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer account found. Set PRIVATE_KEY in .env (64 hex chars, with or without 0x)."
    );
  }

  const [deployer] = signers;
  console.log("Deploying Reputation with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "0G");

  if (balance === BigInt(0)) {
    console.error("No balance! Get testnet tokens from https://faucet.0g.ai");
    process.exit(1);
  }

  console.log("\n--- Deploying Reputation ---");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();

  console.log("Reputation deployed to:", reputationAddress);
  console.log("\nAdd / update in .env (repo root + orchestrator):");
  console.log(`REPUTATION_CONTRACT=${reputationAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_CONTRACT=${reputationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
