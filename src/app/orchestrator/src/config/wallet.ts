import { ethers } from 'ethers'

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `${name} is missing. Set it in .env (repo root or src/app/orchestrator/.env).`
    )
  }
  return value
}

function normalizePrivateKey(raw: string): string {
  const unquoted = raw.replace(/^['"]|['"]$/g, '').trim()
  const normalized = unquoted.startsWith('0x') ? unquoted : `0x${unquoted}`

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      'OG_PRIVATE_KEY must be a 32-byte hex private key (64 hex chars, optional 0x prefix).'
    )
  }

  return normalized
}

export function getRpcUrl(): string {
  return getRequiredEnv('OG_RPC_URL')
}

export function getIndexerRpcUrl(): string {
  return getRequiredEnv('OG_INDEXER_RPC')
}

export function createRpcProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(getRpcUrl())
}

export function createSigner(): ethers.Wallet {
  const provider = createRpcProvider()
  const privateKey = normalizePrivateKey(getRequiredEnv('OG_PRIVATE_KEY'))
  return new ethers.Wallet(privateKey, provider)
}
