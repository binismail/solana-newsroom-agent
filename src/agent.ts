import { getX402PaymentHandler } from './services/paymentHandler.js';
import { WebScraperService, LLMCompletionService, ImageGenerationService } from './services/aceDataServices.js';
import { AceDataCloud } from '@acedatacloud/sdk';
import {
  keypair,
  connection,
  network,
  scrapeTargetUrl,
  loopIntervalMs,
  usdcMint,
  sapProgramId,
  globalRegistry
} from './config.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const synapseSdkPkg = require('@oobe-protocol-labs/synapse-sap-sdk');
const { SapClient, Pdas } = synapseSdkPkg;
const anchorPkg = require('@coral-xyz/anchor');
const { Wallet, BN } = anchorPkg;
const sapTypesPkg = require('@oobe-protocol-labs/synapse-sap-sdk/types');
const { TokenType, SettlementMode } = sapTypesPkg;
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Setup Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n======================================================');
  console.log('🤖 SOLANA NEWSROOM AUTONOMOUS AGENT STARTING 🤖');
  console.log('======================================================\n');

  // 1. Initialize SAP Coordination Layer
  const anchorWallet = new Wallet(keypair);
  const sapClient = new SapClient({
    connection,
    wallet: anchorWallet,
    programId: sapProgramId,
  });

  const [agentPda] = Pdas.getAgentPDA(keypair.publicKey);
  const [agentStatsPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sap_stats'), agentPda.toBuffer()],
    sapProgramId
  );

  console.log(`[SAP Identity] Checking registration for agent PDA: ${agentPda.toBase58()}...`);

  try {
    const existingAgent = await sapClient.fetchAccount('agentAccount', agentPda);
    
    if (existingAgent) {
      console.log(`[SAP Identity] Agent already registered on-chain!`);
      console.log(`  - Name: "${existingAgent.name}"`);
      console.log(`  - Description: "${existingAgent.description}"`);
      console.log(`  - Active: ${existingAgent.isActive}`);
      console.log(`  - Total Calls Served: ${existingAgent.totalCallsServed.toString()}`);
    } else {
      console.log(`[SAP Identity] Agent account NOT found on-chain. Registering new agent identity...`);
      
      // Check wallet SOL balance (0.1 SOL fee + transaction cost is required)
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;
      console.log(`[SAP Identity] Current Wallet Balance: ${balanceSol.toFixed(4)} SOL`);
      
      if (balanceSol < 0.12) {
        console.warn(`[SAP Identity] WARNING: Wallet has ${balanceSol.toFixed(4)} SOL. Registering a new agent requires a 0.1 SOL protocol fee plus transaction costs.`);
        console.warn(`[SAP Identity] Registration might fail. Proceeding with registration attempt...`);
      }

      const registerIx = await sapClient.agent.registerAgent({
        signer: keypair,
        wallet: keypair.publicKey,
        agent: agentPda,
        agentStats: agentStatsPda,
        globalRegistry: globalRegistry,
        name: 'Solana Newsroom Autonomous Agent',
        description: 'An autonomous agent that scrapes Web3 news, summarizes updates using LLMs, and generates visual art.',
        capabilities: [
          {
            id: 'newsroom:scrape',
            description: 'Scrapes web content from blogs and newspapers',
            protocolId: 'newsroom',
            version: '1.0.0'
          },
          {
            id: 'newsroom:analyze',
            description: 'Summarizes text and writes structured headlines',
            protocolId: 'newsroom',
            version: '1.0.0'
          },
          {
            id: 'newsroom:visualize',
            description: 'Generates creative image assets for articles',
            protocolId: 'newsroom',
            version: '1.0.0'
          }
        ],
        pricing: [
          {
            tierId: 'default-x402',
            pricePerCall: new BN(100000), // 0.1 USDC (assuming 6 decimals)
            minPricePerCall: null,
            maxPricePerCall: null,
            rateLimit: 60,
            maxCallsPerSession: 1000,
            burstLimit: null,
            tokenType: TokenType.Usdc,
            tokenMint: usdcMint,
            tokenDecimals: 6,
            settlementMode: SettlementMode.X402,
            minEscrowDeposit: null,
            batchIntervalSec: null,
            volumeCurve: null
          }
        ],
        protocols: ['sap-v2', 'x402'],
        agentId: 'solana-newsroom-agent',
        agentUri: null,
        x402Endpoint: 'https://api.acedata.cloud'
      });

      console.log(`[SAP Identity] Building and signing registration transaction...`);
      const tx = await sapClient.buildTransaction([registerIx], keypair.publicKey);
      tx.sign([keypair]);
      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log(`[SAP Identity] Registration transaction submitted! Signature: ${signature}`);
      console.log(`[SAP Identity] Waiting for confirmation...`);
      
      // Sleep a bit for network finality
      await sleep(5000);
      console.log(`[SAP Identity] Agent successfully registered!`);
    }
  } catch (err: any) {
    console.error(`[SAP Identity] Failed to handle SAP identity setup: ${err.message}`);
    console.error(err.stack);
    console.error(`[SAP Identity] Critical error: Agent on-chain identity setup failed. Terminating to prevent un-indexed execution.`);
    process.exit(1);
  }

  // 2. Initialize Ace Data Cloud Client with X402 Payment Interceptor
  console.log(`\n[AceDataCloud] Initializing client...`);
  const paymentHandler = getX402PaymentHandler(keypair, connection, network);
  
  const client = new AceDataCloud({
    paymentHandler: paymentHandler as any,
  });

  const scraperService = new WebScraperService(client);
  const llmService = new LLMCompletionService(client);
  const imageService = new ImageGenerationService(client);

  console.log(`[AceDataCloud] Client initialized successfully with X402 Solana payment handler.`);

  // 3. Autonomous Execution Loop
  const maxIterations = 3;
  console.log(`\n[Loop] Starting autonomous agent loop. Max iterations: ${maxIterations}. Interval: ${loopIntervalMs}ms`);
  
  let iteration = 1;
  while (iteration <= maxIterations) {
    console.log(`\n------------------------------------------------------`);
    console.log(`[Loop] === RUNNING PIPELINE ITERATION #${iteration} / ${maxIterations} ===`);
    console.log(`[Loop] Current Time: ${new Date().toISOString()}`);
    console.log(`------------------------------------------------------`);

    try {
      // Step 0: Tool Discovery & Selection via SAP
      console.log(`\n[Pipeline] Step 0: Discovering tools via Synapse Agent Protocol (SAP)...`);
      try {
        const agentAccount = await sapClient.fetchAccount('agentAccount', agentPda);
        if (agentAccount) {
          console.log(`[SAP Discovery] Successfully fetched agent metadata from on-chain PDA: ${agentPda.toBase58()}`);
          console.log(`[SAP Discovery] Registered Capabilities:`);
          for (const cap of agentAccount.capabilities) {
            console.log(`  - [Capability] ID: "${cap.id}" | Protocol: "${cap.protocolId}" | Version: "${cap.version}"`);
          }
          console.log(`[SAP Discovery] Registered Pricing Tiers:`);
          for (const tier of agentAccount.pricing) {
            const settlementModeName = tier.settlementMode ? Object.keys(tier.settlementMode)[0] : 'N/A';
            console.log(`  - [Pricing] Tier: "${tier.tierId}" | Base Cost: ${tier.pricePerCall.toString()} base units | Mode: ${settlementModeName}`);
          }
          
          // Selection logic
          const scrapeCap = agentAccount.capabilities.find((c: any) => c.id === 'newsroom:scrape');
          const LLMCap = agentAccount.capabilities.find((c: any) => c.id === 'newsroom:analyze');
          const ImageCap = agentAccount.capabilities.find((c: any) => c.id === 'newsroom:visualize');
          
          if (scrapeCap && LLMCap && ImageCap) {
            console.log(`[SAP Selection] Selected tools matched pipeline requirements successfully!`);
            console.log(`  - Scraper Protocol: "${scrapeCap.protocolId}"`);
            console.log(`  - LLM Protocol: "${LLMCap.protocolId}"`);
            console.log(`  - Image Gen Protocol: "${ImageCap.protocolId}"`);
          } else {
            console.warn(`[SAP Selection] WARNING: Not all pipeline tools are registered in on-chain capabilities.`);
          }
        } else {
          console.warn(`[SAP Discovery] Agent account not found on-chain. Skipping discovery and using defaults.`);
        }
      } catch (err: any) {
        console.warn(`[SAP Discovery] Non-critical tool discovery failure: ${err.message}`);
      }
      console.log(`[Pipeline] Step 0 finished.\n`);

      // Step 1: Trigger -> Scrape Newsroom target
      console.log(`[Pipeline] Step 1: Scraping news from target: ${scrapeTargetUrl}`);
      const scrapedText = await scraperService.scrapeUrl(scrapeTargetUrl);
      console.log(`[Pipeline] Step 1 finished. Scraped ${scrapedText.length} characters.`);

      // Step 2: Analyze -> Summarize and build prompts using LLM
      console.log(`[Pipeline] Step 2: Running LLM completion to analyze news...`);
      const analysis = await llmService.analyzeNews(scrapedText);
      console.log(`[Pipeline] Step 2 finished.`);

      // Step 3: Generate Visual Asset -> Call Image Gen using analyzed details
      console.log(`[Pipeline] Step 3: Requesting Flux Image Generation for prompt: "${analysis.imagePrompt}"`);
      const visualUrl = await imageService.generateVisual(analysis.imagePrompt);
      console.log(`[Pipeline] Step 3 finished.`);

      // Step 4: Log completion metrics
      console.log(`\n[Pipeline] === ITERATION #${iteration} SUCCESSFUL ===`);
      console.log(`  - Headline: "${analysis.headline}"`);
      console.log(`  - Summary: "${analysis.summary}"`);
      console.log(`  - Visual Artwork Asset URL: ${visualUrl}`);
      console.log(`======================================================\n`);

      // If registered on-chain, we could optionally report calls served
      try {
        console.log(`[SAP Stats] Reporting served iteration on-chain...`);
        const reportIx = await sapClient.agent.reportCalls({
          signer: keypair,
          wallet: keypair.publicKey,
          agent: agentPda,
          agentStats: agentStatsPda,
          callsServed: new BN(iteration),
        });
        const tx = await sapClient.buildTransaction([reportIx], keypair.publicKey);
        tx.sign([keypair]);
        const signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });
        console.log(`[SAP Stats] Calls served successfully updated on-chain! Signature: ${signature}`);
      } catch (err: any) {
        console.warn(`[SAP Stats] Non-critical error reporting calls on-chain: ${err.message}`);
        console.error(err.stack);
      }

    } catch (err: any) {
      console.error(`\n[Pipeline] !!! ITERATION #${iteration} FAILED !!!`);
      console.error(`[Pipeline] Error details: ${err.message}`);
      console.error(`[Pipeline] Stack: ${err.stack}`);
      console.log(`======================================================\n`);
      console.error(`[Pipeline] Pipeline encountered an error. Terminating immediately to conserve credits.`);
      process.exit(1);
    }

    iteration++;
    if (iteration <= maxIterations) {
      console.log(`[Loop] Sleeping for ${loopIntervalMs}ms before next iteration...`);
      await sleep(loopIntervalMs);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 AGENT COMPLETED ALL ${maxIterations} SCHEDULED ITERATIONS SUCCESSFULLY! 🎉`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Fatal Error] Agent run crashed:', err);
  process.exit(1);
});
