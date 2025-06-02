// src/services/imageGeneration/factory.ts

import { BaseImageGenerator } from './base'
import { OpenAIImageGenerator } from './openai'
import { StableDiffusionImageGenerator } from './stableDiffusion'

export interface ImageGeneratorConfig {
  provider: 'OpenAI' | 'StableDiffusion'
  apiKey?: string
  baseURL?: string
  modelName?: string
}

export class ImageGeneratorFactory {
  static create(config: ImageGeneratorConfig): BaseImageGenerator {
    switch (config.provider) {
      case 'OpenAI':
        if (!config.apiKey) {
          throw new Error('OpenAI API key is required')
        }
        return new OpenAIImageGenerator({
          apiKey: config.apiKey,
          baseURL: config.baseURL
        })

      case 'StableDiffusion':
        if (!config.baseURL) {
          throw new Error('Stable Diffusion base URL is required')
        }
        return new StableDiffusionImageGenerator({
          baseURL: config.baseURL,
          modelName: config.modelName
        })

      default:
        throw new Error(`Unsupported image generation provider: ${config.provider}`)
    }
  }
}

// 导出所有相关类型和类
export * from './base'
export { OpenAIImageGenerator } from './openai'
export { StableDiffusionImageGenerator } from './stableDiffusion'
