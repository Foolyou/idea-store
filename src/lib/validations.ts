import { z } from "zod";

export const registerSchema = z.object({
  nickname: z
    .string()
    .min(2, "昵称至少 2 个字符")
    .max(20, "昵称最多 20 个字符")
    .trim(),
  password: z
    .string()
    .min(6, "密码至少 6 个字符")
    .max(100, "密码最多 100 个字符"),
});

export const loginSchema = registerSchema;

export const createInspirationSchema = z.object({
  content: z
    .string()
    .min(1, "内容不能为空")
    .max(5000, "内容最多 5000 个字符"),
  images: z.array(z.string().url()).max(9, "最多 9 张图片").optional().default([]),
  visibility: z.enum(["public", "circle", "private"]),
  circle_id: z.string().uuid().optional(),
}).refine(
  (data) => data.visibility !== "circle" || data.circle_id,
  { message: "选择圈子可见范围时，必须指定目标圈子", path: ["circle_id"] }
);

export const updateInspirationSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  images: z.array(z.string().url()).max(9).optional(),
  visibility: z.enum(["public", "circle", "private"]).optional(),
  circle_id: z.string().uuid().nullable().optional(),
});

export const createCircleSchema = z.object({
  name: z
    .string()
    .min(1, "圈子名不能为空")
    .max(30, "圈子名最多 30 个字符")
    .trim(),
  description: z
    .string()
    .max(200, "简介最多 200 个字符")
    .optional()
    .default(""),
});

export const updateSettingsSchema = z.object({
  nickname: z.string().min(2).max(20).trim().optional(),
  avatar_url: z.string().url().nullable().optional(),
  password: z.object({
    old: z.string().min(1),
    new: z.string().min(6).max(100),
  }).optional(),
}).refine(
  (data) => data.nickname || data.avatar_url !== undefined || data.password,
  { message: "至少需要修改一项" }
);

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().max(50).optional(),
});
