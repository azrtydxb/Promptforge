"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Simple encryption for API keys (in production, use a proper KMS)
const ENCRYPTION_KEY = process.env.AI_KEY_ENCRYPTION_SECRET || 'default-encryption-key-change-in-production';

function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

interface CreateAISettingsParams {
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  rateLimit?: number;
  monthlyQuota?: number;
  isDefault?: boolean;
}

interface UpdateAISettingsParams {
  id: string;
  updates: Partial<CreateAISettingsParams> & {
    isActive?: boolean;
  };
}

export async function getAISettings() {
  await requireAdmin();
  
  try {
    const settings = await db.aISettings.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });
    
    // Don't send decrypted API keys to the client
    return settings.map(setting => ({
      ...setting,
      apiKey: '********', // Masked
      hasApiKey: true,
    }));
  } catch (error) {
    logger.error("Error fetching AI settings", error);
    throw new Error("Failed to fetch AI settings");
  }
}

export async function createAISettings(params: CreateAISettingsParams) {
  await requireAdmin();
  
  try {
    // Encrypt the API key
    const encryptedApiKey = encrypt(params.apiKey);
    
    // If this is set as default, unset other defaults
    if (params.isDefault) {
      await db.aISettings.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const settings = await db.aISettings.create({
      data: {
        ...params,
        apiKey: encryptedApiKey,
      },
    });
    
    logger.info("AI settings created", { 
      name: settings.name, 
      provider: settings.provider,
      model: settings.model,
    });
    
    revalidatePath("/admin");
    return { 
      success: true, 
      settings: { ...settings, apiKey: '********' } 
    };
  } catch (error) {
    logger.error("Error creating AI settings", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create AI settings" 
    };
  }
}

export async function updateAISettings({ id, updates }: UpdateAISettingsParams) {
  await requireAdmin();
  
  try {
    const dataToUpdate: Record<string, unknown> = { ...updates };
    
    // Encrypt API key if provided
    if (updates.apiKey) {
      dataToUpdate.apiKey = encrypt(updates.apiKey);
    }
    
    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await db.aISettings.updateMany({
        where: { 
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }
    
    const settings = await db.aISettings.update({
      where: { id },
      data: dataToUpdate,
    });
    
    logger.info("AI settings updated", { 
      id,
      name: settings.name,
      updates: { ...updates, apiKey: updates.apiKey ? '********' : undefined },
    });
    
    revalidatePath("/admin");
    return { 
      success: true, 
      settings: { ...settings, apiKey: '********' } 
    };
  } catch (error) {
    logger.error("Error updating AI settings", error, { id });
    return { 
      success: false, 
      error: "Failed to update AI settings" 
    };
  }
}

export async function deleteAISettings(id: string) {
  await requireAdmin();
  
  try {
    await db.aISettings.delete({
      where: { id },
    });
    
    logger.info("AI settings deleted", { id });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logger.error("Error deleting AI settings", error, { id });
    return { 
      success: false, 
      error: "Failed to delete AI settings" 
    };
  }
}

export async function testAIConnection(id: string) {
  await requireAdmin();
  
  try {
    const settings = await db.aISettings.findUnique({
      where: { id },
    });
    
    if (!settings) {
      throw new Error("AI settings not found");
    }
    
    const apiKey = decrypt(settings.apiKey);
    
    // Test connection based on provider
    let success = false;
    let message = "";
    
    switch (settings.provider.toLowerCase()) {
      case 'openai':
        // Test OpenAI connection
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        success = openaiResponse.ok;
        message = success ? "OpenAI connection successful" : "Failed to connect to OpenAI";
        break;
        
      case 'anthropic':
        // Test Anthropic connection
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
          }),
        });
        success = anthropicResponse.ok || anthropicResponse.status === 400; // 400 is expected for test
        message = success ? "Anthropic connection successful" : "Failed to connect to Anthropic";
        break;
        
      default:
        message = `Provider ${settings.provider} not yet implemented`;
        break;
    }
    
    // Update last used timestamp if successful
    if (success) {
      await db.aISettings.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    }
    
    logger.info("AI connection test", { 
      id, 
      provider: settings.provider, 
      success 
    });
    
    return { success, message };
  } catch (error) {
    logger.error("Error testing AI connection", error, { id });
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Connection test failed" 
    };
  }
}

// Get the active AI settings for use in the application
export async function getActiveAISettings() {
  try {
    const settings = await db.aISettings.findFirst({
      where: { 
        isActive: true,
        OR: [
          { isDefault: true },
          { isActive: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastUsedAt: 'desc' },
      ],
    });
    
    if (!settings) {
      return null;
    }
    
    // Decrypt API key for internal use
    return {
      ...settings,
      apiKey: decrypt(settings.apiKey),
    };
  } catch (error) {
    logger.error("Error fetching active AI settings", error);
    return null;
  }
}