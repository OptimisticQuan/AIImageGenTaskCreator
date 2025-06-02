// src/services/imageGeneration/stableDiffusion.ts

import axios from 'axios'
import { BaseImageGenerator, ImageGenerationOptions } from './base'

interface StableDiffusionConfig {
  baseURL: string
  modelName?: string
}

export class StableDiffusionImageGenerator extends BaseImageGenerator {
  private config: StableDiffusionConfig

  constructor(config: StableDiffusionConfig) {
    super()
    this.config = config
  }

  async generateImages(taskId: string, options: ImageGenerationOptions): Promise<string[]> {
    try {
      this.emitProgress(taskId, 0, 'preparing', '准备生成图像...')

      // 检查是否有附件图片，决定使用 txt2img 还是 img2img
      const hasAttachedImages = options.attachedImages && options.attachedImages.length > 0
      const endpoint = hasAttachedImages 
        ? `${this.config.baseURL}/sdapi/v1/img2img`
        : `${this.config.baseURL}/sdapi/v1/txt2img`

      this.emitProgress(taskId, 10, 'generating', '构建请求参数...')

      const payload: any = {
        prompt: options.prompt,
        steps: options.steps || 20,
        sampler_name: options.samplerName || "DPM++ 2M",
        cfg_scale: options.cfgScale || 7,
        width: options.width || 512,
        height: options.height || 512,
        batch_size: 1,
        n_iter: options.count || 4,
        seed: options.seed || -1
      }

      // 如果有模型名称，设置模型（注意：这可能需要额外的 API 调用来切换模型）
      if (this.config.modelName) {
        await this.setModel(this.config.modelName)
      }

      this.emitProgress(taskId, 20, 'generating', '处理附件图片...')

      // 如果是 img2img，处理附件图片
      if (hasAttachedImages && options.attachedImages) {
        const baseImage = options.attachedImages[0]
        const base64 = await this.fileToBase64(baseImage)
        // 移除 data:image/...;base64, 前缀
        const base64Data = base64.split(',')[1]
        payload.init_images = [base64Data]
        payload.denoising_strength = options.denoisingStrength || 0.7
      }

      this.emitProgress(taskId, 30, 'generating', '发送生成请求...')

      const response = await axios.post(endpoint, payload, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 70) / (progressEvent.total || 1)) + 30
          this.emitProgress(taskId, progress, 'generating', '正在生成图像...')
        }
      })

      this.emitProgress(taskId, 90, 'processing', '处理生成的图像...')

      // 将 base64 图像转换为 blob URLs
      const imageUrls = response.data.images.map((base64Image: string) => {
        return this.base64ToBlob(base64Image, 'image/png')
      })

      this.emitProgress(taskId, 100, 'completed', '图像生成完成')
      this.emitComplete(taskId, imageUrls, true)

      return imageUrls
    } catch (error) {
      console.error('Stable Diffusion image generation error:', error)
      const errorMessage = error instanceof Error ? error.message : '图像生成失败'
      this.emitComplete(taskId, [], false, errorMessage)
      throw error
    }
  }

  private async setModel(modelName: string): Promise<void> {
    try {
      // 获取当前选择的模型
      const currentResponse = await axios.get(`${this.config.baseURL}/sdapi/v1/options`)
      if (currentResponse.data.sd_model_name === modelName) {
        return // 模型已经是当前选择的模型
      }

      // 切换模型
      await axios.post(`${this.config.baseURL}/sdapi/v1/options`, {
        sd_model_name: modelName
      })

      // 等待模型加载完成
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.warn('Failed to set model:', error)
      // 不抛出错误，继续使用当前模型
    }
  }
}
