import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer account found. Set PRIVATE_KEY in .env (64 hex chars, with or without 0x)."
    );
  }

  const [deployer] = signers;
  console.log("Deploying MatchEscrow with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "0G");

  if (balance === BigInt(0)) {
    console.error("No balance! Get testnet tokens from https://faucet.0g.ai");
    process.exit(1);
  }

  const orchestrator = process.env.MATCH_ORCHESTRATOR || deployer.address;
  const protocolFeeRecipient = process.env.MATCH_PROTOCOL_FEE_RECIPIENT || deployer.address;
  const joinTimeoutSeconds = Number(process.env.MATCH_JOIN_TIMEOUT_SECONDS || "1800");
  const inftContract =
    process.env.INFT_CONTRACT?.trim() ||
    process.env.NEXT_PUBLIC_INFT_CONTRACT?.trim();

  if (!inftContract?.startsWith("0x")) {
    throw new Error(
      "Set INFT_CONTRACT (or NEXT_PUBLIC_INFT_CONTRACT) to your deployed AgenticID / iNFT address. MatchEscrow needs ownerOf(agentId) checks."
    );
  }

  console.log("\n--- Deploying MatchEscrow ---");
  console.log("orchestrator:", orchestrator);
  console.log("protocolFeeRecipient:", protocolFeeRecipient);
  console.log("joinTimeoutSeconds:", joinTimeoutSeconds);
  console.log("inftContract:", inftContract);

  const MatchEscrow = await ethers.getContractFactory("MatchEscrow");
  const matchEscrow = await MatchEscrow.deploy(
    orchestrator,
    protocolFeeRecipient,
    joinTimeoutSeconds,
    inftContract
  );
  await matchEscrow.waitForDeployment();
  const matchEscrowAddress = await matchEscrow.getAddress();

  console.log("MatchEscrow deployed to:", matchEscrowAddress);
  console.log("\nAdd these to your .env files:");
  console.log(`MATCH_CONTRACT=${matchEscrowAddress}`);
  console.log(`NEXT_PUBLIC_MATCH_CONTRACT=${matchEscrowAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
