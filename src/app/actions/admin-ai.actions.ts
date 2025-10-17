"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { clearOpenAIClient } from "@/services/embedding-service";
import OpenAI from "openai";
import crypto from "crypto";

// Simple encryption for API keys (in production, use a proper KMS)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function getAISettings() {
  await requireAdmin();
  
  try {
    const settings = await db.aISettings.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Don't send actual API keys to the client
    return settings.map(setting => ({
      ...setting,
      apiKey: undefined
    }));
  } catch (error) {
    logger.error("Error fetching AI settings", { error });
    throw new Error("Failed to fetch AI settings");
  }
}

export async function createAISettings(data: {
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  isActive?: boolean;
  isDefault?: boolean;
}) {
  await requireAdmin();
  
  try {
    // If setting as default, unset other defaults for the same provider
    if (data.isDefault) {
      await db.aISettings.updateMany({
        where: { provider: data.provider },
        data: { isDefault: false }
      });
    }
    
    const encryptedApiKey = encryptApiKey(data.apiKey);
    
    const settings = await db.aISettings.create({
      data: {
        ...data,
        apiKey: encryptedApiKey
      }
    });
    
    // Clear the cached OpenAI client so it uses the new settings
    clearOpenAIClient();
    
    revalidatePath("/admin/ai-settings");
    
    return settings;
  } catch (error) {
    logger.error("Error creating AI settings", { error });
    throw new Error("Failed to create AI settings");
  }
}

export async function updateAISettings(id: string, data: {
  model?: string;
  apiKey?: string;
  isActive?: boolean;
  isDefault?: boolean;
}) {
  await requireAdmin();
  
  try {
    const updateData: Record<string, unknown> = { ...data };
    
    // Encrypt API key if provided
    if (data.apiKey) {
      updateData.apiKey = encryptApiKey(data.apiKey);
    }
    
    // If setting as default, unset other defaults for the same provider
    if (data.isDefault) {
      const currentSettings = await db.aISettings.findUnique({
        where: { id }
      });
      
      if (currentSettings) {
        await db.aISettings.updateMany({
          where: { 
            provider: currentSettings.provider,
            id: { not: id }
          },
          data: { isDefault: false }
        });
      }
    }
    
    const settings = await db.aISettings.update({
      where: { id },
      data: updateData
    });
    
    // Clear the cached OpenAI client so it uses the new settings
    clearOpenAIClient();
    
    revalidatePath("/admin/ai-settings");
    
    return settings;
  } catch (error) {
    logger.error("Error updating AI settings", { error });
    throw new Error("Failed to update AI settings");
  }
}

export async function deleteAISettings(id: string) {
  await requireAdmin();
  
  try {
    await db.aISettings.delete({
      where: { id }
    });
    
    // Clear the cached OpenAI client
    clearOpenAIClient();
    
    revalidatePath("/admin/ai-settings");
  } catch (error) {
    logger.error("Error deleting AI settings", { error });
    throw new Error("Failed to delete AI settings");
  }
}

export async function testAIConnection(provider: string, configType: string = "general") {
  await requireAdmin();
  
  try {
    const settings = await db.aISettings.findFirst({
      where: {
        provider,
        name: configType
      }
    });
    
    if (!settings) {
      return { success: false, error: "No settings found for this provider" };
    }
    
    const apiKey = decryptApiKey(settings.apiKey);
    
    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      
      if (configType === "embedding") {
        // Test embeddings for embedding configuration
        const response = await openai.embeddings.create({
          model: settings.model,
          input: "test",
        });
        
        if (response.data && response.data.length > 0) {
          return { success: true };
        }
      } else {
        // Test chat completion for general AI configuration
        const response = await openai.chat.completions.create({
          model: settings.model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 10
        });
        
        if (response.choices && response.choices.length > 0) {
          return { success: true };
        }
      }
    }
    
    return { success: false, error: "Provider not supported" };
  } catch (error) {
    logger.error("Error testing AI connection", { error, provider, configType });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Connection test failed" 
    };
  }
}

// Fetch available models from OpenAI using stored settings
export async function fetchOpenAIModelsFromSettings(configType: "general" | "embedding") {
  await requireAdmin();
  
  try {
    // Get the stored settings
    const settings = await db.aISettings.findFirst({
      where: {
        provider: "openai",
        name: configType
      }
    });
    
    if (!settings) {
      return {
        success: false,
        error: "No OpenAI configuration found. Please save your API key first."
      };
    }
    
    // Decrypt the API key
    const apiKey = decryptApiKey(settings.apiKey);
    
    // Fetch models using the decrypted key
    return fetchOpenAIModels(apiKey);
  } catch (error) {
    logger.error("Error fetching OpenAI models from settings", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch models"
    };
  }
}

// Fetch available models from OpenAI
export async function fetchOpenAIModels(apiKey: string) {
  await requireAdmin();
  
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.models.list();
    
    // Log all available models for debugging
    logger.info("Available OpenAI models", { 
      count: response.data.length,
      models: response.data.map(m => m.id)
    });
    
    // Filter models into categories
    const allModels = response.data.sort((a, b) => {
      // Sort by model ID to group similar models together
      if (a.id.startsWith('gpt-4') && !b.id.startsWith('gpt-4')) return -1;
      if (!a.id.startsWith('gpt-4') && b.id.startsWith('gpt-4')) return 1;
      if (a.id.startsWith('gpt-3.5') && !b.id.startsWith('gpt-3.5')) return -1;
      if (!a.id.startsWith('gpt-3.5') && b.id.startsWith('gpt-3.5')) return 1;
      return b.created - a.created;
    });
    
    // Categorize models more precisely
    const chatModels = allModels.filter(m => {
      const id = m.id.toLowerCase();
      
      // Include GPT models
      if (id.includes('gpt-4') || id.includes('gpt-3.5')) {
        // Exclude specific non-chat variants
        return !id.includes('instruct') && !id.includes('0125') && !id.includes('0301');
      }
      
      // Include o1 models
      if (id.startsWith('o1-')) return true;
      
      // Include chat models
      if (id.includes('chat')) return true;
      
      // Exclude embeddings, whisper, tts, dall-e
      const excludePatterns = ['embedding', 'embed', 'whisper', 'tts', 'dall-e', 'davinci-002', 'babbage-002', 'ada-002'];
      return !excludePatterns.some(pattern => id.includes(pattern));
    });
    
    const embeddingModels = allModels.filter(m => {
      const id = m.id.toLowerCase();
      return id.includes('embedding') || id.includes('embed');
    });
    
    logger.info("Filtered models", {
      chatModels: chatModels.map(m => m.id),
      embeddingModels: embeddingModels.map(m => m.id)
    });
    
    return {
      success: true,
      chatModels: chatModels.map(m => ({
        id: m.id,
        name: m.id,
        created: new Date(m.created * 1000)
      })),
      embeddingModels: embeddingModels.map(m => ({
        id: m.id,
        name: m.id,
        created: new Date(m.created * 1000)
      }))
    };
  } catch (error) {
    logger.error("Error fetching OpenAI models", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch models"
    };
  }
}

// Embedding management functions
export async function resetEmbeddingIndex() {
  await requireAdmin();
  
  try {
    // Reset all embeddings to null
    // Note: embedding field is Unsupported("vector") type, so we skip it
    await db.prompt.updateMany({
      data: {
        embeddingOutdated: true
      }
    });

    await db.promptTemplate.updateMany({
      data: {
        embeddingOutdated: true
      }
    });
    
    logger.info("Embedding index reset completed");
    
    return { 
      success: true, 
      message: "Embedding index has been reset. All embeddings marked for regeneration." 
    };
  } catch (error) {
    logger.error("Error resetting embedding index", { error });
    throw new Error("Failed to reset embedding index");
  }
}

export async function triggerEmbeddingRegeneration() {
  await requireAdmin();
  
  try {
    // Import the queue functions
    const { scheduleBatchEmbeddingUpdate } = await import('@/lib/queues/embedding-queue');
    
    // Mark all embeddings as outdated
    await db.prompt.updateMany({
      data: { embeddingOutdated: true }
    });
    
    await db.promptTemplate.updateMany({
      data: { embeddingOutdated: true }
    });
    
    // Schedule batch update
    await scheduleBatchEmbeddingUpdate();
    
    logger.info("Embedding regeneration triggered");
    
    return { 
      success: true, 
      message: "Embedding regeneration has been scheduled." 
    };
  } catch (error) {
    logger.error("Error triggering embedding regeneration", { error });
    throw new Error("Failed to trigger embedding regeneration");
  }
}

export async function getEmbeddingStats() {
  await requireAdmin();
  
  try {
    const [
      totalPrompts,
      promptsWithEmbeddings,
      outdatedPromptEmbeddings,
      totalTemplates,
      templatesWithEmbeddings,
      outdatedTemplateEmbeddings
    ] = await Promise.all([
      db.prompt.count(),
      db.prompt.count({ where: { embeddingOutdated: false } }),
      db.prompt.count({ where: { embeddingOutdated: true } }),
      db.promptTemplate.count(),
      db.promptTemplate.count({ where: { embeddingOutdated: false } }),
      db.promptTemplate.count({ where: { embeddingOutdated: true } })
    ]);
    
    return {
      prompts: {
        total: totalPrompts,
        withEmbeddings: promptsWithEmbeddings,
        outdated: outdatedPromptEmbeddings,
        pending: totalPrompts - promptsWithEmbeddings
      },
      templates: {
        total: totalTemplates,
        withEmbeddings: templatesWithEmbeddings,
        outdated: outdatedTemplateEmbeddings,
        pending: totalTemplates - templatesWithEmbeddings
      }
    };
  } catch (error) {
    logger.error("Error getting embedding stats", { error });
    throw new Error("Failed to get embedding statistics");
  }
}

export async function getEmbeddingQueueStatus() {
  await requireAdmin();
  
  try {
    const { getQueueStats } = await import('@/lib/queues/embedding-queue');
    
    // Get queue stats first
    const stats = await getQueueStats();
    
    // Try to get health status, but don't fail if it errors
    let health = {
      isHealthy: false,
      hasActiveWorkers: false,
      message: "Unable to check worker health"
    };
    
    try {
      const { checkWorkerHealth } = await import('@/lib/queues/worker-health');
      const healthResult = await checkWorkerHealth();
      health = {
        isHealthy: healthResult.isHealthy,
        hasActiveWorkers: healthResult.hasActiveWorkers,
        message: healthResult.message
      };
    } catch (healthError) {
      logger.error("Error checking worker health", { 
        error: healthError instanceof Error ? healthError.message : 'Unknown error' 
      });
    }
    
    return {
      ...stats,
      health
    };
  } catch (error) {
    logger.error("Error getting queue status", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      health: {
        isHealthy: false,
        hasActiveWorkers: false,
        message: "Failed to connect to queue system"
      }
    };
  }
}

// System settings management
export async function getSystemSetting(key: string) {
  await requireAdmin();
  
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key }
    });
    
    return setting?.value || null;
  } catch (error) {
    logger.error("Error getting system setting", { error, key });
    return null;
  }
}

export async function setSystemSetting(key: string, value: string, description?: string) {
  await requireAdmin();
  
  try {
    const setting = await db.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
    
    revalidatePath("/admin/ai-settings");
    
    return setting;
  } catch (error) {
    logger.error("Error setting system setting", { error, key, value });
    throw new Error("Failed to update system setting");
  }
}

export async function getSemanticSearchEnabled() {
  await requireAdmin();
  
  const value = await getSystemSetting('semantic_search_enabled');
  return value === 'true';
}

export async function setSemanticSearchEnabled(enabled: boolean) {
  await requireAdmin();
  
  await setSystemSetting(
    'semantic_search_enabled', 
    enabled.toString(),
    'Global toggle for semantic search functionality'
  );
  
  logger.info("Semantic search setting updated", { enabled });
  
  return { success: true, enabled };
}

// Export the decrypt function for use in the embedding service
export { decryptApiKey };