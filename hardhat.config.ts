import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    zgTestnet: {
      url: process.env.ZG_TESTNET_RPC || "https://evmrpc-testnet.0g.ai",
      accounts: [PRIVATE_KEY],
      chainId: 16602,
    },
  },
};

export default config;
