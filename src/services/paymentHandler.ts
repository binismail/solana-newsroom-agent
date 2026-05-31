import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { createX402PaymentHandler, SolanaWalletAdapter } from '@acedatacloud/x402-client';

/**
 * KeypairWalletAdapter bridges a local Solana Keypair to the 
 * SolanaWalletAdapter interface required by the @acedatacloud/x402-client SDK.
 */
export class KeypairWalletAdapter implements SolanaWalletAdapter {
  publicKey: {
    toBase58(): string;
    toString(): string;
  };
  private lastPayTo: string | null = null;

  constructor(private keypair: Keypair, private connection: Connection) {
    this.publicKey = {
      toBase58: () => this.keypair.publicKey.toBase58(),
      toString: () => this.keypair.publicKey.toString(),
    };
  }

  /**
   * Set the last intercepted payTo wallet address.
   */
  setLastPayTo(payTo: string) {
    this.lastPayTo = payTo;
  }

  /**
   * Automatically signs and sends the SPL-USDC transfer transaction on Solana
   * when prompted by the X402 client runtime.
   */
  async signAndSendTransaction(tx: unknown): Promise<string> {
    if (!(tx instanceof Transaction)) {
      throw new Error('KeypairWalletAdapter: Expected standard Transaction instance.');
    }

    console.log('\n[X402 INTERCEPTOR] === Payment Requirement Detected ===');
    console.log(`[X402 INTERCEPTOR] Payer Key: ${this.publicKey.toBase58()}`);
    console.log(`[X402 INTERCEPTOR] Recent Blockhash: ${tx.recentBlockhash || 'Not set (will be loaded)'}`);

    // Try to inspect the instruction for transparency and check/initialize destination ATA
    try {
      const tokenTransferIx = tx.instructions.find(ix => ix.keys.length >= 4);
      if (tokenTransferIx) {
        const sourceATA = tokenTransferIx.keys[0].pubkey;
        const mint = tokenTransferIx.keys[1].pubkey;
        const destinationATA = tokenTransferIx.keys[2].pubkey;
        
        console.log(`[X402 INTERCEPTOR] Mint Address: ${mint.toBase58()}`);
        console.log(`[X402 INTERCEPTOR] Source Token Account: ${sourceATA.toBase58()}`);
        console.log(`[X402 INTERCEPTOR] Destination Token Account: ${destinationATA.toBase58()}`);

        // Check if destination token account exists on-chain
        const destAccountInfo = await this.connection.getAccountInfo(destinationATA);
        if (destAccountInfo === null) {
          console.log(`[X402 INTERCEPTOR] Destination token account ${destinationATA.toBase58()} does NOT exist on-chain.`);
          
          if (!this.lastPayTo) {
            throw new Error('KeypairWalletAdapter: Cannot initialize destination ATA because lastPayTo is not set.');
          }

          console.log(`[X402 INTERCEPTOR] Generating associated token account creation instruction for owner: ${this.lastPayTo}...`);
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const createIx = createAssociatedTokenAccountInstruction(
            this.keypair.publicKey, // payer
            destinationATA,        // associatedToken
            new PublicKey(this.lastPayTo), // owner
            mint                   // mint
          );

          // Prepend the creation instruction to the transaction!
          tx.instructions.unshift(createIx);
          console.log(`[X402 INTERCEPTOR] Prepend instruction to create destination ATA for owner ${this.lastPayTo}.`);
        }
      }
    } catch (err: any) {
      console.warn(`[X402 INTERCEPTOR] Warning during instruction inspection/setup: ${err.message}`);
    }

    console.log('[X402 INTERCEPTOR] Signing transaction locally...');
    tx.partialSign(this.keypair);

    console.log('[X402 INTERCEPTOR] Submitting and confirming transaction on-chain...');
    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.keypair], {
      commitment: 'confirmed',
    });

    console.log(`[X402 INTERCEPTOR] Payment SETTLED! Signature: ${signature}`);
    console.log('[X402 INTERCEPTOR] ========================================\n');

    return signature;
  }
}

export function getX402PaymentHandler(keypair: Keypair, connection: Connection, networkType: string = 'devnet') {
  const walletAdapter = new KeypairWalletAdapter(keypair, connection);
  
  const rawHandler = createX402PaymentHandler({
    network: 'solana',
    solanaWallet: walletAdapter,
  });

  return async function x402PaymentHandler(ctx: any) {
    if (ctx.accepts) {
      ctx.accepts = ctx.accepts.map((req: any) => {
        if (req.network === 'solana') {
          // Track the recipient system owner address
          if (req.payTo) {
            walletAdapter.setLastPayTo(req.payTo);
          }
        }
        return req;
      });
    }
    return rawHandler(ctx);
  };
}

export default getX402PaymentHandler;
