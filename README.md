# 0G Island — On-Chain AI Dating Show

> *Real personalities. Live drama. Permanent reputation. Built on 0G.*

**0G Island** is an on-chain AI dating show where users mint **intelligent agent iNFTs**, escrow stakes in a smart contract, and watch **4-round live matches** unfold in real time. Contestants are LLM-backed agents with unique personalities, backstories, and hidden strategies. They read live Chooser reactions via **0G KV shared memory**, adapt their game, and compete for on-chain reputation. Winners can be bred together to mint the next generation of smarter agents.

---

## Table of Contents

- [Demo](#demo)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [0G Protocol Features Used](#0g-protocol-features-used)
- [Agent Swarm: Communication & Coordination](#agent-swarm-communication--coordination)
- [iNFT: Intelligence Embedded On-Chain](#inft-intelligence-embedded-on-chain)
- [Smart Contracts](#smart-contracts)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Team](#team)

---

## Demo

| | |
|---|---|
| **Live Demo** | _TBD_ |
| **Demo Video** | _TBD_ (< 3 min) |
| **GitHub Repo** | https://github.com/shivamshaw/love-0g |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser (Next.js)                         │
│                                                                    │
│   Landing / Match Lobby / Arena ──── RainbowKit + wagmi ────────  │
│          │                                    │                    │
│   REST (API routes)             Socket.io (live events)           │
└──────────┼────────────────────────────────────┼────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐             ┌──────────────────────────────┐
│  Next.js BFF Routes  │             │  Orchestrator (Express +     │
│  /api/matches/*      │             │  Socket.io)                  │
│  /api/agents/*       │             │                              │
│  (tx encoding,       │             │  ┌────────────────────────┐  │
│   on-chain reads)    │             │  │     MatchEngine         │  │
└──────────────────────┘             │  │  (round loop, parallel  │  │
           │                         │  │   contestant + chooser) │  │
           │                         │  └────────┬───────────────┘  │
           │                         │           │                   │
           ▼                         │  ┌────────▼───────────────┐  │
┌──────────────────────┐             │  │  LLM Agents            │  │
│  0G Galileo Testnet  │◄────────────┤  │  contestant.ts         │  │
│  (chainId: 16602)    │             │  │  chooser.ts            │  │
│                      │             │  │  judge.ts              │  │
│  AgenticID (iNFT)    │             │  └────────┬───────────────┘  │
│  MatchEscrow         │             │           │                   │
│  Reputation          │             │  ┌────────▼───────────────┐  │
└──────────────────────┘             │  │  0G Storage SDK        │  │
                                     │  │  og-kv.ts / og-log.ts  │  │
                                     │  │  (Indexer + MemData)   │  │
                                     │  └───────────────────────-┘  │
                                     └──────────────────────────────┘
```

### Data Flow per Match Round

1. **Users** mint agent iNFTs (on-chain + blob on 0G Storage) and create/join a match via `MatchEscrow`.
2. **Arena page** polls the chain for match state and calls `POST /api/matches/start` once all agents are seated.
3. **Orchestrator `MatchEngine`** runs 4 rounds:
   - Contestant agents call `readChooserReaction` — pulling the **current Chooser state blob from 0G KV** (root hash tracked in-engine).
   - Contestant responses are generated **in parallel** via LLM.
   - **Chooser agent** evaluates all contestant messages, updates emotional state.
   - `writeChooserState` **pushes the new state blob to 0G KV** and updates the tracked root hash.
   - Round events (`message`, `chooser_message`, `chooser_state`, `round_start`) are broadcast via **Socket.io** to room `match:{id}`.
4. At match end the full transcript is uploaded to 0G Storage (`og-log.ts`) and the winner is recorded on-chain via `MatchEscrow`.

---

## Tech Stack

### Frontend
| Technology | Role |
|---|---|
| **Next.js 16 + React 19** | App Router, SSR, API routes (BFF) |
| **Tailwind CSS** | Styling |
| **RainbowKit + wagmi + viem** | Wallet connection, on-chain reads/writes |
| **TanStack Query** | Data fetching and caching |
| **Socket.io-client** | Real-time match event streaming |
| **Recharts / Leaflet** | Stats visualizations |

### Backend (Orchestrator)
| Technology | Role |
|---|---|
| **Express + Socket.io** | HTTP API + WebSocket server |
| **OpenAI SDK** | LLM calls routed via Integrate Network router |
| **ethers v6** | Chain interactions (create signer, write contract) |
| **tsx** | TypeScript execution (watch mode for dev) |

### Blockchain
| Technology | Role |
|---|---|
| **Solidity 0.8.27** | Smart contracts |
| **Hardhat** | Compile, test, deploy |
| **OpenZeppelin** | ERC-721 base for AgenticID |
| **0G Galileo Testnet** | Target network (chainId: 16602) |

### AI / Storage
| Technology | Role |
|---|---|
| **`@0gfoundation/0g-ts-sdk`** | Blob upload/download (Indexer + MemData) |
| **Integrate Network LLM Router** | AI inference for agent personalities |

---

## 0G Protocol Features Used

### 1. 0G Storage — Agent Intelligence Blobs
When a user mints an agent, its full profile JSON (personality traits, backstory, hidden strategy, voice description) is uploaded to **0G Storage** via the `Indexer` SDK (`MemData`). The resulting **root hash** is stored as `storageRoot` in the `AgenticID` iNFT on-chain. This makes the agent's intelligence **verifiably linked** to the NFT while keeping bulk data off-chain but content-addressed.

### 2. 0G KV — Shared Chooser Memory
During a live match, the **Chooser's emotional state** (reactions, impressions, internal monologue) is stored as a JSON blob in **0G KV** between every round. Contestant agents **read this shared state** using the last root hash before generating their next message. This implements **genuine shared memory** across agents — contestants adapt to the Chooser's real reactions as they accumulate, not a synthetic prompt.

### 3. 0G Chain — On-Chain Reputation & Escrow
- `AgenticID`:  iNFT contract that mints agents with `storageRoot` linking to 0G Storage.
- `MatchEscrow`: Stakes, match lifecycle (Created → Active → Complete/Failed), and winner settlement.
- `Reputation`: Permanent win/loss/match count per agent, written on-chain at match conclusion.

### 4. ERC-7857 Interface
`AgenticID` implements the ERC-7857 Intelligent NFT interface (`contracts/interfaces/IERC7857.sol`), aligning with the emerging standard for on-chain AI agent identity.

---

## Agent Swarm: Communication & Coordination

0G Island uses a **centralized orchestrator + shared KV memory** model rather than a fully peer-to-peer swarm, optimized for low latency and real-time streaming.

### Roles
| Agent | Description |
|---|---|
| **Contestant** (`contestant.ts`) | Up to 2 agents per match. Each has a unique personality JSON, secret strategy, and backstory fetched from 0G Storage. They run in **parallel** each round. |
| **Chooser** (`chooser.ts`) | One human-like evaluator who reads all contestant messages and maintains evolving emotional state across rounds. |
| **Judge** (`judge.ts`) | Final arbiter — determines winner after 4 rounds based on accumulated Chooser state and round transcripts. |

### Coordination Protocol
```
Round N:
  ├── [Contestant A] readChooserReaction(rootHash) ──► 0G KV blob download
  ├── [Contestant B] readChooserReaction(rootHash) ──► 0G KV blob download
  │         (parallel LLM calls)
  ├── [Chooser] evaluateRound(A_msg, B_msg, currentState) ──► new state JSON
  └── [Engine]  writeChooserState(newState) ──► 0G KV blob upload → newRootHash

  Socket.io broadcast to room match:{id}:
    → "message" (contestant A)
    → "message" (contestant B)
    → "chooser_message"
    → "chooser_state" (updated root hash + preview)
```

Agents don't message each other directly — they share state through the **0G KV medium**, making 0G Storage the coordination bus. The **MatchEngine** acts as the clock/scheduler, ensuring correct ordering and race-condition-free round transitions.

---

## iNFT: Intelligence Embedded On-Chain

Each agent in 0G Island is an **intelligent NFT (iNFT)** minted on `AgenticID` (0G Galileo testnet).

### What's Stored On-Chain
- Token ID (unique agent identity)
- Owner address
- `storageRoot` — content-addressed hash pointing to the agent's intelligence blob on 0G Storage

### What's in the Intelligence Blob (0G Storage)
```json
{
  "name": "Agent name",
  "personality": ["trait1", "trait2", ...],
  "backstory": "...",
  "voice": "...",
  "strategy": "hidden dating strategy",
  "appearance": "...",
  "createdAt": "ISO timestamp"
}
```

### Verify On 0G Explorer
- **Storage scan**: https://storagescan.0g.ai — search by root hash to verify agent blob
- **Chain scan**: https://chainscan-galileo.0g.ai — search by contract address or token ID

---

## Smart Contracts

| Contract | Address (0G Galileo Testnet) |
|---|---|
| **AgenticID** (iNFT) | `0x2c3cA8E8aD267A3A2EaAAC5a9044095d56f998A9` |
| **MatchEscrow** | `0xCBeA36AF6215fF982c73E7a197cc99403B119f06` |
| **Reputation** | `0x99dD32B000E2A01cD9E5211c013A6355d7Ea0551` |

**Network:** 0G Galileo Testnet — Chain ID `16602`
**RPC:** `https://evmrpc-testnet.0g.ai`
**Explorer:** https://chainscan-galileo.0g.ai

### Contract Summaries

**`AgenticID.sol`** — ERC-721 + ERC-7857 intelligent NFT. `mintAgent(to, storageRoot)` links each token to its intelligence blob. Ownership gates match creation.

**`MatchEscrow.sol`** — Manages full match lifecycle. `createMatch(agentId, stake)` opens a match; `joinMatch(matchId, agentId)` fills the seat. `startMatch` / `completeMatch` / `failMatch` transition states. `logRoot` stores the final match transcript root hash on-chain.

**`Reputation.sol`** — Append-only reputation ledger. Incremented by the orchestrator (via `OG_PRIVATE_KEY`) at match conclusion: wins, losses, total matches per `agentId`.

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm 9+
- A wallet with 0G Galileo testnet gas

### 1. Clone & Install

```bash
git clone https://github.com/shivamshaw/love-0g.git
cd love-0g
npm run install:all
```

This installs both root dependencies (Next.js frontend + Hardhat) and orchestrator dependencies.

### 2. Configure Environment

Copy and fill in both env files:

```bash
cp .env.example .env
cp src/app/orchestrator/.env.example src/app/orchestrator/.env
```

See [Environment Variables](#environment-variables) below for required values.

### 3. Compile Contracts (optional — already deployed)

```bash
npm run compile
```

### 4. Deploy Contracts (optional — already deployed)

```bash
npm run deploy:testnet          # AgenticID
npm run deploy:reputation       # Reputation
# deploy:match deploys MatchEscrow
```

### 5. Run Development Servers

```bash
# Run both Next.js (port 3000) and orchestrator (port 3001) concurrently
npm run dev:all

# Or run separately
npm run dev               # Next.js frontend
npm run dev:orchestrator  # Express + Socket.io orchestrator
```

Open http://localhost:3000 in your browser.

---

## Environment Variables

### Root `.env` (frontend + Hardhat)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | AgenticID contract address |
| `NEXT_PUBLIC_INFT_CONTRACT` | AgenticID contract address (alias) |
| `NEXT_PUBLIC_REPUTATION_CONTRACT` | Reputation contract address |
| `NEXT_PUBLIC_MATCH_CONTRACT` | MatchEscrow contract address |
| `NEXT_PUBLIC_ORCHESTRATOR_URL` | Orchestrator base URL (e.g. `http://localhost:3001`) |
| `OG_RPC_URL` | 0G chain RPC endpoint |
| `OG_INDEXER_RPC` | 0G storage indexer endpoint |
| `ZG_SERVICE_URL` | 0G compute / LLM router URL |
| `ZG_API_SECRET` | API secret for LLM router |
| `ZG_PROVIDER_ADDRESS` | Provider wallet address (LLM billing) |
| `ZG_TESTNET_RPC` | 0G testnet RPC (Hardhat deployments) |
| `PRIVATE_KEY` | Deployer private key (Hardhat only) |
| `INFT_CONTRACT` | AgenticID address (server-side) |
| `REPUTATION_CONTRACT` | Reputation address (server-side) |
| `MATCH_CONTRACT` | MatchEscrow address (server-side) |

### `src/app/orchestrator/.env`

| Variable | Description |
|---|---|
| `PORT` | Orchestrator listen port (default: 3001) |
| `OG_RPC_URL` | 0G chain RPC |
| `OG_INDEXER_RPC` | 0G storage indexer RPC |
| `OG_PRIVATE_KEY` | Orchestrator wallet private key (writes reputation + match results on-chain) |
| `ZG_SERVICE_URL` | LLM router base URL |
| `ZG_API_SECRET` | LLM router API secret |
| All `*_CONTRACT` vars | Same contract addresses as root env |

---

## Team

| Name | Telegram | X (Twitter) |
|---|---|---|
| Shivam Shaw | [@shivamshaw](https://t.me/adder_99) | [@shivamshaw](https://x.com/tryptophan0x36) |

---

## License

MIT
