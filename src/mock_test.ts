import { WebScraperService, LLMCompletionService, ImageGenerationService } from './services/aceDataServices.js';
import { keypair, connection, scrapeTargetUrl } from './config.js';

// Setup Mock AceDataCloud client
const mockClient: any = {
  webextrator: {
    extract: async (params: any) => {
      console.log(`[Mock Web Extractor] Simulating scraping for: ${params.url}`);
      return {
        markdown: `Solana Developers release a major upgrade to the validator client, boosting transaction processing efficiency by 15% under high congestion. The release, version v2.0.4, is now live on Devnet and ready for public testing.`
      };
    }
  },
  openai: {
    chat: {
      completions: {
        create: async (params: any) => {
          console.log(`[Mock LLM] Simulating completion using model: ${params.model}`);
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    headline: 'Solana Validator Client Upgrade v2.0.4 Live on Devnet',
                    summary: 'Developers have launched version v2.0.4 of the Solana validator client, introducing a 15% efficiency increase for processing congested traffic.',
                    imagePrompt: 'A futuristic glowing Solana token logo surrounded by high-speed data streams, neon violet and green laser grids, sleek server hardware, high-tech engineering style, detailed digital art.'
                  })
                }
              }
            ]
          };
        }
      }
    }
  },
  images: {
    generate: async (params: any) => {
      console.log(`[Mock Image Generator] Simulating image generation for prompt: "${params.prompt}"`);
      return {
        url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80'
      };
    }
  }
};

async function runMockVerification() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING END-TO-END AGENT MOCK VERIFICATION 🧪');
  console.log('======================================================\n');

  console.log(`[Config] Loaded Wallet: ${keypair.publicKey.toBase58()}`);
  
  const scraperService = new WebScraperService(mockClient);
  const llmService = new LLMCompletionService(mockClient);
  const imageService = new ImageGenerationService(mockClient);

  try {
    // Step 1: Scrape
    console.log(`[Pipeline] Step 1: Scraping news from target: ${scrapeTargetUrl}`);
    const scrapedText = await scraperService.scrapeUrl(scrapeTargetUrl);
    console.log(`[Pipeline] Step 1 finished. Scraped ${scrapedText.length} characters.`);

    // Step 2: LLM Analysis
    console.log(`[Pipeline] Step 2: Running LLM completion to analyze news...`);
    const analysis = await llmService.analyzeNews(scrapedText);
    console.log(`[Pipeline] Step 2 finished.`);

    // Step 3: Image Generation
    console.log(`[Pipeline] Step 3: Requesting Image Generation for prompt: "${analysis.imagePrompt}"`);
    const visualUrl = await imageService.generateVisual(analysis.imagePrompt);
    console.log(`[Pipeline] Step 3 finished.`);

    // Final output log
    console.log(`\n[Pipeline] === E2E VERIFICATION SUCCESSFUL ===`);
    console.log(`  - Headline: "${analysis.headline}"`);
    console.log(`  - Summary: "${analysis.summary}"`);
    console.log(`  - Visual Artwork Asset URL: ${visualUrl}`);
    console.log(`======================================================\n`);

  } catch (err: any) {
    console.error(`\n[Pipeline] !!! VERIFICATION FAILED !!!`);
    console.error(`Error details: ${err.message}`);
    process.exit(1);
  }
}

runMockVerification().catch(console.error);
