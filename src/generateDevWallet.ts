import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Setup Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n======================================================');
  console.log('🔑 SOLANA DEV WALLET GENERATOR & AIRDROPPER 🔑');
  console.log('======================================================\n');

  const walletPath = path.resolve('dev-wallet.json');
  let keypair: Keypair;

  // 1. Check or Generate dev-wallet.json
  if (fs.existsSync(walletPath)) {
    console.log(`[Generator] dev-wallet.json already exists.`);
    try {
      const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
      keypair = Keypair.fromSecretKey(secret);
    } catch (err: any) {
      console.error(`[Generator] Failed to load dev-wallet.json: ${err.message}. Generating a new one...`);
      keypair = Keypair.generate();
      fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
    }
  } else {
    console.log(`[Generator] Generating a new Solana keypair...`);
    keypair = Keypair.generate();
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`[Generator] Saved keypair to: ${walletPath}`);
  }

  const walletAddress = keypair.publicKey.toBase58();
  console.log(`[Generator] Wallet Address (Public Key): ${walletAddress}`);

  // 2. Request devnet SOL airdrop
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log(`[Generator] Connecting to Devnet and requesting 2 SOL airdrop...`);
  
  try {
    const airdropSig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
    console.log(`[Generator] Airdrop transaction submitted. Confirming...`);
    
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    await connection.confirmTransaction({
      signature: airdropSig,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');
    
    console.log(`[Generator] Airdrop confirmed! Signature: ${airdropSig}`);
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`[Generator] New Wallet Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  } catch (err: any) {
    console.error(`[Generator] Airdrop request failed: ${err.message}`);
    console.log(`[Generator] Don't worry! You can manually request devnet SOL to your wallet address:`);
    console.log(`  solana airdrop 2 ${walletAddress} --url devnet`);
  }

  // 3. Update .env file
  const envPath = path.resolve('.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Set SOLANA_KEYPAIR_PATH
  if (envContent.includes('SOLANA_KEYPAIR_PATH=')) {
    envContent = envContent.replace(/SOLANA_KEYPAIR_PATH=.*/, `SOLANA_KEYPAIR_PATH=./dev-wallet.json`);
  } else {
    envContent += `\nSOLANA_KEYPAIR_PATH=./dev-wallet.json\n`;
  }

  // Make sure SOLANA_PRIVATE_KEY is cleared out so keypair path is used
  if (envContent.includes('SOLANA_PRIVATE_KEY=')) {
    envContent = envContent.replace(/SOLANA_PRIVATE_KEY=.*/, `SOLANA_PRIVATE_KEY=`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`[Generator] Updated .env file:`);
  console.log(`  - Set SOLANA_KEYPAIR_PATH=./dev-wallet.json`);
  console.log(`  - Cleared SOLANA_PRIVATE_KEY to ensure file loading.`);

  console.log('\n======================================================');
  console.log('🎉 DEV WALLET INITIALIZED SUCCESSFULLY! 🎉');
  console.log('======================================================');
  console.log(`To fund this wallet with Devnet USDC for X402 payment testing:`);
  console.log(`1. Copy your address: ${walletAddress}`);
  console.log(`2. Go to: https://faucet.circle.com/`);
  console.log(`3. Paste address, select "Solana" -> "Devnet", and request tokens.`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('[Fatal Error] Generator failed:', err);
  process.exit(1);
});
