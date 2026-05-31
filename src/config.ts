import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sapConstantsPkg = require('@oobe-protocol-labs/synapse-sap-sdk/constants');
const {
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
  MAINNET_SAP_PROGRAM_ID,
  DEVNET_SAP_PROGRAM_ID,
  GLOBAL_REGISTRY_ADDRESS
} = sapConstantsPkg;

dotenv.config();

// Helper to expand ~ in paths
function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/')) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, filepath.slice(2));
  }
  return filepath;
}

// Load keypair from various sources
function loadKeypair(): Keypair {
  const keypairPath = 'agent-keypair.json';
  if (fs.existsSync(keypairPath)) {
    try {
      const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
      return Keypair.fromSecretKey(secretKey);
    } catch (err: any) {
      console.error(`[Config] Failed to load keypair from file ${keypairPath}: ${err.message}`);
      throw err;
    }
  } else {
    try {
      const newKeypair = Keypair.generate();
      const secretKeyArray = Array.from(newKeypair.secretKey);
      fs.writeFileSync(keypairPath, JSON.stringify(secretKeyArray), 'utf-8');
      console.log('\n======================================================');
      console.log('🔑 NEW AGENT KEYPAIR GENERATED 🔑');
      console.log(`Public Key: ${newKeypair.publicKey.toBase58()}`);
      console.log('Saved to: agent-keypair.json');
      console.log('======================================================\n');
      return newKeypair;
    } catch (err: any) {
      console.error(`[Config] Failed to generate and save keypair to ${keypairPath}: ${err.message}`);
      throw err;
    }
  }
}

export const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const network = (process.env.SOLANA_NETWORK || 'mainnet-beta').toLowerCase() as 'devnet' | 'mainnet-beta';

export const keypair = loadKeypair();
export const connection = new Connection(rpcUrl, 'confirmed');

export const usdcMint = network === 'mainnet-beta' 
  ? USDC_MINT_MAINNET 
  : USDC_MINT_DEVNET;
export const sapProgramId = network === 'mainnet-beta' ? MAINNET_SAP_PROGRAM_ID : DEVNET_SAP_PROGRAM_ID;
export const globalRegistry = GLOBAL_REGISTRY_ADDRESS;

export const scrapeTargetUrl = process.env.SCRAPE_TARGET_URL || 'https://solana.com/news';
export const loopIntervalMs = parseInt(process.env.LOOP_INTERVAL_MS || '10000', 10);

console.log(`[Config] Loaded configuration:
  - Network: ${network}
  - RPC URL: ${rpcUrl}
  - Public Key: ${keypair.publicKey.toBase58()}
  - USDC Mint: ${usdcMint.toBase58()}
  - SAP Program ID: ${sapProgramId.toBase58()}
  - Registry Address: ${globalRegistry.toBase58()}
  - Scrape Target: ${scrapeTargetUrl}
  - Loop Interval: ${loopIntervalMs}ms
`);
