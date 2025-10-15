import OpenAI from 'openai';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { decryptApiKey } from '@/app/actions/admin-ai.actions';

// Configuration - will be loaded from database
let openaiClient: OpenAI | null = null;
let EMBEDDING_MODEL = 'text-embedding-3-small'; // Default, will be overridden from DB
const EMBEDDING_VERSION = 1;
const BATCH_SIZE = 100; // Process embeddings in batches

/**
 * Get or create OpenAI client with API key from database
 */
async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;
  
  // Get the active OpenAI settings from database
  const aiSettings = await db.aISettings.findFirst({
    where: {
      name: 'embedding',
      isActive: true,
      isDefault: true
    }
  });
  
  if (!aiSettings || !aiSettings.apiKey) {
    throw new Error('No active OpenAI API key configured in admin settings. Please configure it in Admin > AI Settings.');
  }
  
  // Decrypt the API key
  const apiKey = decryptApiKey(aiSettings.apiKey);
  
  // Update the embedding model from settings
  if (aiSettings.model) {
    EMBEDDING_MODEL = aiSettings.model;
  }
  
  openaiClient = new OpenAI({
    apiKey: apiKey,
  });
  
  return openaiClient;
}

/**
 * Clear the cached OpenAI client (useful when settings change)
 */
export function clearOpenAIClient() {
  openaiClient = null;
}

export interface EmbeddingInput {
  id: string;
  text: string;
  type: 'prompt' | 'template';
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = await getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding', { error, text: text.substring(0, 100) });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const openai = await getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    
    return response.data.map(d => d.embedding);
  } catch (error) {
    logger.error('Error generating batch embeddings', { error, count: texts.length });
    throw error;
  }
}

/**
 * Prepare text for embedding from prompt data
 */
export function preparePromptText(prompt: {
  title: string;
  description?: string | null;
  content?: string | null;
  tags?: { name: string }[];
}): string {
  const parts = [
    prompt.title,
    prompt.description || '',
    prompt.content || '',
    prompt.tags?.map(t => t.name).join(' ') || ''
  ].filter(Boolean);
  
  return parts.join(' ').substring(0, 8000); // Limit text length
}

/**
 * Prepare text for embedding from template data
 */
export function prepareTemplateText(template: {
  name: string;
  description?: string | null;
  content: string;
  category: string;
  example?: string | null;
}): string {
  const parts = [
    template.name,
    template.description || '',
    template.content,
    template.category,
    template.example || ''
  ].filter(Boolean);
  
  return parts.join(' ').substring(0, 8000); // Limit text length
}

/**
 * Update embeddings for prompts that need it
 */
export async function updatePromptEmbeddings(userId?: string, limit = BATCH_SIZE) {
  try {
    // Find prompts that need embeddings
    const prompts = await db.prompt.findMany({
      where: {
        ...(userId ? { userId } : {}),
        OR: [
          { embedding: null },
          { embeddingOutdated: true },
          { embeddingVersion: { not: EMBEDDING_VERSION } }
        ]
      },
      include: {
        tags: true
      },
      take: limit
    });

    if (prompts.length === 0) {
      logger.info('No prompts need embedding updates');
      return { updated: 0 };
    }

    logger.info(`Updating embeddings for ${prompts.length} prompts`);

    const startTime = Date.now();

    // Prepare texts for embedding
    const texts = prompts.map(prompt => preparePromptText(prompt));

    // Generate embeddings in batch
    const embeddings = await generateEmbeddings(texts);

    // Update prompts with embeddings
    const updatePromises = prompts.map((prompt, index) =>
      db.prompt.update({
        where: { id: prompt.id },
        data: {
          embedding: JSON.stringify(embeddings[index]),
          embeddingVersion: EMBEDDING_VERSION,
          embeddingOutdated: false
        }
      })
    );

    await Promise.all(updatePromises);

    const duration = Date.now() - startTime;

    // Log AI usage
    if (userId) {
      await db.aIUsageLog.create({
        data: {
          userId,
          operation: 'embedding',
          provider: 'openai',
          model: EMBEDDING_MODEL,
          tokensUsed: texts.reduce((sum, text) => sum + text.split(' ').length, 0),
          cost: prompts.length * 0.00002, // Approximate cost per embedding
          duration,
          success: true
        }
      });
    }

    logger.info(`Successfully updated ${prompts.length} prompt embeddings`);
    return { updated: prompts.length };
  } catch (error) {
    logger.error('Error updating prompt embeddings', { error });
    throw error;
  }
}

/**
 * Update embeddings for templates that need it
 */
export async function updateTemplateEmbeddings(limit = BATCH_SIZE) {
  try {
    // Find templates that need embeddings
    const templates = await db.promptTemplate.findMany({
      where: {
        OR: [
          { embedding: null },
          { embeddingOutdated: true },
          { embeddingVersion: { not: EMBEDDING_VERSION } }
        ]
      },
      take: limit
    });

    if (templates.length === 0) {
      logger.info('No templates need embedding updates');
      return { updated: 0 };
    }

    logger.info(`Updating embeddings for ${templates.length} templates`);

    // Prepare texts for embedding
    const texts = templates.map(template => prepareTemplateText(template));
    
    // Generate embeddings in batch
    const embeddings = await generateEmbeddings(texts);
    
    // Update templates with embeddings
    const updatePromises = templates.map((template, index) => 
      db.promptTemplate.update({
        where: { id: template.id },
        data: {
          embedding: JSON.stringify(embeddings[index]),
          embeddingVersion: EMBEDDING_VERSION,
          embeddingOutdated: false
        }
      })
    );

    await Promise.all(updatePromises);

    logger.info(`Successfully updated ${templates.length} template embeddings`);
    return { updated: templates.length };
  } catch (error) {
    logger.error('Error updating template embeddings', { error });
    throw error;
  }
}

/**
 * Mark prompt embedding as outdated (e.g., after content update)
 */
export async function markPromptEmbeddingOutdated(promptId: string) {
  await db.prompt.update({
    where: { id: promptId },
    data: { embeddingOutdated: true }
  });
}

/**
 * Mark template embedding as outdated
 */
export async function markTemplateEmbeddingOutdated(templateId: string) {
  await db.promptTemplate.update({
    where: { id: templateId },
    data: { embeddingOutdated: true }
  });
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
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