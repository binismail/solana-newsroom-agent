import { AceDataCloud } from '@acedatacloud/sdk';

/**
 * Service to scrape target websites using Ace Data Cloud's Web Extractor API.
 */
export class WebScraperService {
  constructor(private client: AceDataCloud) {}

  async scrapeUrl(url: string): Promise<string> {
    console.log(`[WebScraperService] Scraping contents of: ${url}`);
    try {
      const response = await this.client.webextrator.extract({
        url,
        enableLlm: false,
        expectedType: 'article',
      });
      
      console.log('[WebScraperService] Scraping successful!');
      
      // Extracted text content is typically returned as markdown or raw content
      const content = response.markdown || response.content || response.text || JSON.stringify(response);
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (err: any) {
      console.error(`[WebScraperService] Scraping failed: ${err.message}`);
      throw err;
    }
  }
}

export interface AnalysisResult {
  headline: string;
  summary: string;
  imagePrompt: string;
}

/**
 * Service to analyze news contents and structure headlines/image-prompts using LLMs.
 */
export class LLMCompletionService {
  constructor(private client: AceDataCloud) {}

  async analyzeNews(text: string): Promise<AnalysisResult> {
    console.log(`[LLMCompletionService] Analyzing news content (${text.length} characters)...`);
    
    const userPrompt = `You are a senior editor for a Solana-themed autonomous news publication.
Analyze the following scraped news content and focus on the primary update, project release, or ecosystem news.

Provide a JSON response with exactly three keys:
1. "headline": A punchy, compelling, and professional news headline.
2. "summary": A concise 1-2 sentence description explaining the key update and its impact.
3. "imagePrompt": A highly descriptive prompt for a Flux image generator. IMPORTANT RULES for the prompt:
   - DO NOT reference any real company logos, brand names, or trademarked symbols (AI generators distort these badly).
   - Instead, describe an abstract, symbolic scene that captures the MOOD and THEME of the headline.
   - Use this style: "A futuristic digital art composition on a dark navy background. [Describe abstract geometric shapes, glowing orbs, crystalline structures, flowing data streams, or cosmic elements that symbolize the headline theme]. Rendered in vivid neon purple, electric cyan, and warm gold tones. Ultra-high resolution, 8k, cinematic volumetric lighting, clean vector edges, smooth gradients, no text, no letters, no logos."
   - Keep it under 120 words.

Return ONLY raw JSON. Do not include markdown wraps or backticks.

Content to analyze:
${text.slice(0, 8000)}
`;

    try {
      const response = await this.client.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI news analyzer that only outputs raw, parseable JSON.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      });

      const rawContent = ((response as any).choices?.[0]?.message?.content as string) || '';
      
      // Clean up markdown formatting if the LLM added it
      let cleanJson = rawContent.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const parsed: AnalysisResult = JSON.parse(cleanJson);
      
      console.log('[LLMCompletionService] News analysis finished.');
      console.log(`[LLMCompletionService] Headline: "${parsed.headline}"`);
      console.log(`[LLMCompletionService] Summary: "${parsed.summary}"`);
      
      return parsed;
    } catch (err: any) {
      console.error(`[LLMCompletionService] Completion analysis failed: ${err.message}`);
      throw err;
    }
  }
}

/**
 * Service to generate high-quality visual art assets representing news articles.
 */
export class ImageGenerationService {
  constructor(private client: AceDataCloud) {}

  async generateVisual(prompt: string): Promise<string> {
    console.log(`[ImageGenerationService] Generating artwork for prompt: "${prompt}"`);
    try {
      // Call images.generate with wait: false.
      // If it completes immediately, it returns the completed result object (with data).
      // If it runs asynchronously, it returns a TaskHandle.
      const handle = await this.client.images.generate({
        prompt,
        provider: 'flux',
        wait: false,
        size: '1024x1024',
      }) as any;

      let taskState: any = null;

      if (handle && handle.data) {
        console.log('[ImageGenerationService] Image generated synchronously!');
        taskState = handle;
      } else if (handle && typeof handle.get === 'function') {
        console.log(`[ImageGenerationService] Task launched asynchronously. Task ID: ${handle.id}. Polling for completion...`);

        const pollInterval = 3000; // Poll every 3 seconds
        const maxWait = 300000;    // Wait up to 5 minutes
        const start = Date.now();

        while (Date.now() - start < maxWait) {
          taskState = await handle.get();
          if (taskState && (taskState.finished_at || taskState.response?.finished_at)) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        if (!taskState || (!taskState.finished_at && !taskState.response?.finished_at)) {
          throw new Error(`Task ${handle.id} did not complete within ${maxWait}ms`);
        }

        console.log('[ImageGenerationService] Image generation task finished.');
      } else {
        throw new Error(`Failed to start image generation task. Invalid response: ${JSON.stringify(handle)}`);
      }
      
      let imageUrl = '';
      if (taskState && typeof taskState === 'object') {
        const payload = taskState.response || taskState;
        if (payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
          imageUrl = payload.data[0].image_url || payload.data[0].url || payload.data[0].b64_json || '';
        } else if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
          imageUrl = payload.images[0];
        } else if (payload.url) {
          imageUrl = payload.url;
        }
      }

      if (!imageUrl) {
        throw new Error(`Failed to find image url in response: ${JSON.stringify(taskState)}`);
      }

      console.log(`[ImageGenerationService] Generated Image URL: ${imageUrl}`);
      return imageUrl;
    } catch (err: any) {
      console.error(`[ImageGenerationService] Image generation failed: ${err.message}`);
      throw err;
    }
  }
}
