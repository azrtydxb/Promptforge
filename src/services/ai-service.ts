import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface AIEnhancementSuggestion {
  type: "clarity" | "specificity" | "context" | "structure" | "alternative";
  suggestion: string;
  example?: string;
  confidence: number;
}

export interface AIEnhancementResult {
  enhancedContent: string;
  suggestions: AIEnhancementSuggestion[];
  explanation: string;
}

export interface AutoTagResult {
  tags: string[];
  confidence: { [tag: string]: number };
}

class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  private async getClient() {
    // Get active AI settings directly from database
    const settings = await db.aISettings.findFirst({
      where: { 
        isActive: true,
        name: 'general'
      }
    });
    
    if (!settings) {
      throw new Error("No active AI settings configured");
    }

    switch (settings.provider.toLowerCase()) {
      case "openai":
        if (!this.openai) {
          this.openai = new OpenAI({
            apiKey: settings.apiKey,
          });
        }
        return { client: this.openai, settings };
      
      case "anthropic":
        if (!this.anthropic) {
          this.anthropic = new Anthropic({
            apiKey: settings.apiKey,
          });
        }
        return { client: this.anthropic, settings };
      
      default:
        throw new Error(`Unsupported AI provider: ${settings.provider}`);
    }
  }

  async enhancePrompt(
    promptContent: string,
    userId: string,
    promptId?: string
  ): Promise<AIEnhancementResult> {
    const startTime = Date.now();
    let tokensUsed = 0;
    let cost = 0;

    try {
      const { client, settings } = await this.getClient();
      
      const systemPrompt = `You are an expert prompt engineer. Analyze the given prompt and provide:
1. An enhanced version that is clearer, more specific, and more effective
2. Specific suggestions for improvement
3. A brief explanation of the changes

Focus on:
- Clarity and specificity
- Adding helpful context
- Improving structure
- Removing ambiguity
- Making the prompt more actionable

Respond in JSON format:
{
  "enhancedContent": "the improved prompt",
  "suggestions": [
    {
      "type": "clarity|specificity|context|structure|alternative",
      "suggestion": "specific suggestion",
      "example": "optional example",
      "confidence": 0.0-1.0
    }
  ],
  "explanation": "brief explanation of changes"
}`;

      let result: AIEnhancementResult;

      if (settings.provider === "openai" && client instanceof OpenAI) {
        const response = await client.chat.completions.create({
          model: settings.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please enhance this prompt:\n\n${promptContent}` }
          ],
          temperature: 0.7,
          max_tokens: settings.maxTokens || 1000,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No response from AI");
        
        result = JSON.parse(content);
        tokensUsed = response.usage?.total_tokens || 0;
        
        // Estimate cost (rough estimates)
        if (settings.model.includes("gpt-4")) {
          cost = (tokensUsed / 1000) * 0.03; // $0.03 per 1K tokens
        } else {
          cost = (tokensUsed / 1000) * 0.002; // $0.002 per 1K tokens
        }
      } else if (settings.provider === "anthropic" && client instanceof Anthropic) {
        const response = await client.messages.create({
          model: settings.model,
          messages: [
            { role: "user", content: `${systemPrompt}\n\nPlease enhance this prompt:\n\n${promptContent}` }
          ],
          max_tokens: settings.maxTokens || 1000,
        });

        const content = response.content[0];
        if (content.type !== 'text') throw new Error("Unexpected response type");
        
        result = JSON.parse(content.text);
        tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
        
        // Estimate cost for Claude
        cost = (tokensUsed / 1000) * 0.008; // $0.008 per 1K tokens
      } else {
        throw new Error("Invalid AI client configuration");
      }

      // Log usage
      await db.aIUsageLog.create({
        data: {
          userId,
          promptId,
          operation: "enhance",
          provider: settings.provider,
          model: settings.model,
          tokensUsed,
          cost,
          duration: Date.now() - startTime,
          success: true,
          metadata: { enhancementType: "full" }
        }
      });

      return result;
    } catch (error) {
      logger.error("AI enhancement failed", error);
      
      // Log failure
      await db.aIUsageLog.create({
        data: {
          userId,
          promptId,
          operation: "enhance",
          provider: "unknown",
          model: "unknown",
          tokensUsed: 0,
          cost: 0,
          duration: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });

      throw error;
    }
  }

  async generateAutoTags(
    promptContent: string,
    userId: string,
    promptId?: string
  ): Promise<AutoTagResult> {
    const startTime = Date.now();
    let tokensUsed = 0;
    let cost = 0;

    try {
      const { client, settings } = await this.getClient();
      
      const systemPrompt = `Analyze the given prompt and suggest relevant tags. 
Return 3-7 tags that best categorize the prompt.
Tags should be:
- Single words or short phrases
- Lowercase
- Relevant to the prompt's purpose and domain
- General enough to be reusable

Respond in JSON format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": {
    "tag1": 0.9,
    "tag2": 0.8,
    "tag3": 0.7
  }
}`;

      let result: AutoTagResult;

      if (settings.provider === "openai" && client instanceof OpenAI) {
        const response = await client.chat.completions.create({
          model: settings.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate tags for:\n\n${promptContent}` }
          ],
          temperature: 0.5,
          max_tokens: 200,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No response from AI");
        
        result = JSON.parse(content);
        tokensUsed = response.usage?.total_tokens || 0;
      } else if (settings.provider === "anthropic" && client instanceof Anthropic) {
        const response = await client.messages.create({
          model: settings.model,
          messages: [
            { role: "user", content: `${systemPrompt}\n\nGenerate tags for:\n\n${promptContent}` }
          ],
          max_tokens: 200,
        });

        const content = response.content[0];
        if (content.type !== 'text') throw new Error("Unexpected response type");
        
        result = JSON.parse(content.text);
        tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      } else {
        throw new Error("Invalid AI client configuration");
      }

      // Calculate cost
      if (settings.model.includes("gpt-3.5")) {
        cost = (tokensUsed / 1000) * 0.0005;
      } else if (settings.model.includes("gpt-4")) {
        cost = (tokensUsed / 1000) * 0.01;
      } else {
        cost = (tokensUsed / 1000) * 0.002;
      }

      // Log usage
      await db.aIUsageLog.create({
        data: {
          userId,
          promptId,
          operation: "auto-tag",
          provider: settings.provider,
          model: settings.model,
          tokensUsed,
          cost,
          duration: Date.now() - startTime,
          success: true,
          metadata: { tagsGenerated: result.tags.length }
        }
      });

      return result;
    } catch (error) {
      logger.error("Auto-tagging failed", error);
      
      await db.aIUsageLog.create({
        data: {
          userId,
          promptId,
          operation: "auto-tag",
          provider: "unknown",
          model: "unknown",
          tokensUsed: 0,
          cost: 0,
          duration: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });

      throw error;
    }
  }

  async generateEmbedding(
    text: string,
    userId: string
  ): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      const { client, settings } = await this.getClient();
      
      if (settings.provider !== "openai" || !(client instanceof OpenAI)) {
        throw new Error("Embeddings currently only supported with OpenAI");
      }

      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const embedding = response.data[0].embedding;
      const tokensUsed = response.usage.total_tokens;
      const cost = (tokensUsed / 1000) * 0.00002; // $0.00002 per 1K tokens

      // Log usage
      await db.aIUsageLog.create({
        data: {
          userId,
          operation: "embedding",
          provider: "openai",
          model: "text-embedding-3-small",
          tokensUsed,
          cost,
          duration: Date.now() - startTime,
          success: true,
        }
      });

      return embedding;
    } catch (error) {
      logger.error("Embedding generation failed", error);
      
      await db.aIUsageLog.create({
        data: {
          userId,
          operation: "embedding",
          provider: "openai",
          model: "text-embedding-3-small",
          tokensUsed: 0,
          cost: 0,
          duration: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });

      throw error;
    }
  }

  async findSimilarPrompts(
    embedding: number[],
    limit: number = 5,
    excludeId?: string
  ): Promise<Array<{ id: string; similarity: number }>> {
    // Use pgvector for efficient similarity search
    const embeddingString = `[${embedding.join(',')}]`;

    const results = excludeId
      ? await db.$queryRaw<Array<{ id: string; similarity: number }>>`
          SELECT
            id,
            1 - (CAST(embedding AS vector) <=> CAST(${embeddingString} AS vector)) as similarity
          FROM "Prompt"
          WHERE
            embedding IS NOT NULL
            AND id != ${excludeId}
          ORDER BY CAST(embedding AS vector) <=> CAST(${embeddingString} AS vector)
          LIMIT ${limit}
        `
      : await db.$queryRaw<Array<{ id: string; similarity: number }>>`
          SELECT
            id,
            1 - (CAST(embedding AS vector) <=> CAST(${embeddingString} AS vector)) as similarity
          FROM "Prompt"
          WHERE
            embedding IS NOT NULL
          ORDER BY CAST(embedding AS vector) <=> CAST(${embeddingString} AS vector)
          LIMIT ${limit}
        `;

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const aiService = new AIService();