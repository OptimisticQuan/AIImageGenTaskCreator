// src/services/imageGeneration/openai.ts

import OpenAI from 'openai'
import { BaseImageGenerator, ImageGenerationOptions } from './base'

interface OpenAIConfig {
  apiKey: string
  baseURL?: string
}

export class OpenAIImageGenerator extends BaseImageGenerator {
  private client: OpenAI

  constructor(config: OpenAIConfig) {
    super()
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  async generateImages(taskId: string, options: ImageGenerationOptions): Promise<string[]> {
    try {
      this.emitProgress(taskId, 0, 'preparing', '准备生成图像...')

      const model = options.model || 'dall-e-3'
      const size = this.getSizeString(options.width, options.height)
      const quality = 'standard'
      
      // DALL-E 3 只支持 n=1，DALL-E 2 支持多张
      const n = model === 'dall-e-3' ? 1 : Math.min(options.count || 1, 4)
      
      this.emitProgress(taskId, 10, 'generating', `使用 ${model} 生成图像...`)

      const response = await this.client.images.generate({
        model,
        prompt: options.prompt,
        n,
        size: size as '1024x1024' | '1792x1024' | '1024x1792',
        quality: quality as 'standard' | 'hd'
      })

      this.emitProgress(taskId, 80, 'processing', '处理生成的图像...')

      const imageUrls = response!.data!.map(image => image.url!).filter(Boolean)

      // 如果是 DALL-E 3 但需要多张图片，需要多次调用
      if (model === 'dall-e-3' && (options.count || 1) > 1) {
        const additionalCount = (options.count || 1) - 1
        for (let i = 0; i < additionalCount; i++) {
          this.emitProgress(taskId, 80 + (i + 1) * 15 / additionalCount, 'generating', `生成第 ${i + 2} 张图像...`)
          
          const additionalResponse = await this.client.images.generate({
            model,
            prompt: options.prompt,
            n: 1,
            size: size as '1024x1024' | '1792x1024' | '1024x1792',
            quality: quality as 'standard' | 'hd'
          })
          
          if (additionalResponse?.data?.[0]?.url) {
            imageUrls.push(additionalResponse.data[0].url)
          }
        }
      }

      this.emitProgress(taskId, 100, 'completed', '图像生成完成')
      this.emitComplete(taskId, imageUrls, true)

      return imageUrls
    } catch (error) {
      console.error('OpenAI image generation error:', error)
      const errorMessage = error instanceof Error ? error.message : '图像生成失败'
      this.emitComplete(taskId, [], false, errorMessage)
      throw error
    }
  }

  private getSizeString(width?: number, height?: number): string {
    if (!width && !height) return '1024x1024'
    
    const w = width || 1024
    const h = height || 1024
    
    // DALL-E 3 支持的尺寸
    if (w === 1024 && h === 1024) return '1024x1024'
    if (w === 1792 && h === 1024) return '1792x1024'
    if (w === 1024 && h === 1792) return '1024x1792'
    
    // 默认返回正方形
    return '1024x1024'
  }
}
