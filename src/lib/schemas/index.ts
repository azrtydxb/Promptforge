import { z } from 'zod';

// Base schemas
export const baseSchemas = {
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }),
  
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).refine(
    (data) => {
      if (data.start && data.end) {
        return data.start <= data.end;
      }
      return true;
    },
    {
      message: "Start date must be before end date",
    }
  ),
  
  entityId: z.string().min(1, "ID is required"),
  
  sorting: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
};

// User schemas
export const userSchemas = {
  profile: z.object({
    username: z.string().min(3).max(30).optional(),
    avatarType: z.enum(['INITIALS', 'GRAVATAR', 'UPLOAD']).optional(),
    gravatarEmail: z.string().email().optional(),
    profilePicture: z.string().url().optional(),
  }),
  
  register: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
};

// Prompt schemas
export const promptSchemas = {
  create: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().max(1000, "Description too long").optional(),
    content: z.string().optional(),
    folderId: z.string().nullable().optional(),
    tags: z.array(z.string()).max(10, "Too many tags").optional(),
  }),
  
  update: z.object({
    id: baseSchemas.entityId,
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    content: z.string().optional(),
    folderId: z.string().nullable().optional(),
    tags: z.array(z.string()).max(10).optional(),
  }),
  
  search: z.object({
    query: z.string().min(1).max(500),
    ...baseSchemas.pagination.shape,
    filters: z.object({
      tags: z.array(z.string()).optional(),
      folderId: z.string().nullable().optional(),
      hasEnhancement: z.boolean().optional(),
      dateRange: baseSchemas.dateRange.optional(),
    }).optional(),
  }),
  
  publish: z.object({
    promptId: baseSchemas.entityId,
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  }),
};

// Tag schemas
export const tagSchemas = {
  create: z.object({
    name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
    description: z.string().max(500, "Description must be less than 500 characters").optional(),
  }),
  
  update: z.object({
    id: baseSchemas.entityId,
    name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
    description: z.string().max(500, "Description must be less than 500 characters").optional(),
  }),
};

// Collection schemas
export const collectionSchemas = {
  create: z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(false),
  }),
  
  update: z.object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isPublic: z.boolean().optional(),
  }),
};

// Comment schemas
export const commentSchemas = {
  create: z.object({
    sharedPromptId: baseSchemas.entityId,
    content: z.string().min(1).max(2000),
    parentId: baseSchemas.entityId.optional(),
  }),
  
  update: z.object({
    commentId: baseSchemas.entityId,
    content: z.string().min(1).max(2000),
  }),
};

// Rating schemas
export const ratingSchemas = {
  create: z.object({
    rating: z.number().min(1).max(5),
    review: z.string().max(1000).optional(),
  }),
};

// Moderation schemas
export const moderationSchemas = {
  moderate: z.object({
    promptId: baseSchemas.entityId,
    status: z.enum(["APPROVED", "REJECTED", "FLAGGED"]),
    reason: z.string().optional(),
  }),
  
  createRule: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    pattern: z.string().min(1),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    action: z.enum(["FLAG", "BLOCK", "REJECT", "REQUIRE_REVIEW"]),
    isActive: z.boolean().default(true),
  }),
};

// Draft schemas
export const draftSchemas = {
  save: z.object({
    promptId: baseSchemas.entityId.optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    content: z.string().optional(),
    folderId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }),
};

// Export type inference helpers
export type PaginationInput = z.infer<typeof baseSchemas.pagination>;
export type DateRangeInput = z.infer<typeof baseSchemas.dateRange>;
export type CreatePromptInput = z.infer<typeof promptSchemas.create>;
export type UpdatePromptInput = z.infer<typeof promptSchemas.update>;
export type SearchPromptInput = z.infer<typeof promptSchemas.search>;
export type PublishPromptInput = z.infer<typeof promptSchemas.publish>;
export type CreateTagInput = z.infer<typeof tagSchemas.create>;
export type UpdateTagInput = z.infer<typeof tagSchemas.update>;
export type CreateCollectionInput = z.infer<typeof collectionSchemas.create>;
export type UpdateCollectionInput = z.infer<typeof collectionSchemas.update>;
export type CreateCommentInput = z.infer<typeof commentSchemas.create>;
export type UpdateCommentInput = z.infer<typeof commentSchemas.update>;
export type CreateRatingInput = z.infer<typeof ratingSchemas.create>;
export type ModeratePromptInput = z.infer<typeof moderationSchemas.moderate>;
export type CreateModerationRuleInput = z.infer<typeof moderationSchemas.createRule>;
export type SaveDraftInput = z.infer<typeof draftSchemas.save>;
export type UserProfileInput = z.infer<typeof userSchemas.profile>;
export type RegisterInput = z.infer<typeof userSchemas.register>;