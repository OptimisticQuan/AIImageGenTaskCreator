// src/types/index.ts

export interface UploadedImage {
  id: string; // UUID for key prop and reference
  file: File;
  previewUrl: string; // Object URL for preview
  name: string; // Original file name
}

export enum TaskStatus {
  Idle = 'idle', // 等待生成
  Pending = 'pending', // 已加入队列，等待API调用
  Generating = 'generating', // 生成中
  Completed = 'completed', // 生成完毕
  Failed = 'failed', // 生成失败
}

export interface GeneratedImage {
  id: string; // UUID
  url: string; // URL of the generated image (can be blob URL if processed client-side)
  seed?: string | number; // Optional: seed used for generation
  // Other metadata if provided by API
}

export interface Task {
  id: string; // UUID
  originalPrompt: string; // LLM解析前的用户输入，或者就是该任务的提示词
  prompt: string; // 该任务的具体提示词 (可编辑)
  attachedImageIds?: string[]; // 关联的上传图片 ID 列表 (用于LLM分析或图生图)
  status: TaskStatus;
  progress?: number; // 0-100, for 'generating' status
  generatedImages: GeneratedImage[];
  error?: string; // Error message if status is 'failed'
  // Potentially other parameters for image generation API
  // e.g., negativePrompt, sampler, steps, cfgScale, width, height
}

export interface LLMSettings {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ImageGenerationSettings {
  supplier: string; // e.g., "OpenAI", "StableDiffusionWebUI", "ComfyUI"
  baseUrl: string;
  apiKey?: string; // May not be needed for local SD
  modelName?: string; // Checkpoint name for SD, model for DALL-E
}

export interface CommonSettings {
  batchSize: number; // 批量执行每批数量
  theme: 'light' | 'dark'; // 主题设置
  // 其他通用设置可以在这里添加
}

export interface AppSettings {
  llm: LLMSettings;
  imageGeneration: ImageGenerationSettings;
  common?: CommonSettings; // 可选的通用设置
}

// Default settings structure
export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
  },
  imageGeneration: {
    supplier: 'Tuzi',
    baseUrl: ' https://api.tu-zi.com/v1',
    apiKey: '',
    modelName: 'gpt-4o-image-vip',
  },
  common: {
    batchSize: 2, // Default batch size
    theme: 'light', // Default theme
  }
};
