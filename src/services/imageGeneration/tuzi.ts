import OpenAI from 'openai'
import { BaseImageGenerator, ImageGenerationOptions } from './base'
import { ChatCompletionContentPart } from 'openai/resources'

export interface TuziConfig {
  apiKey: string
  baseURL?: string
  model?: string
}

export class TuziImageGenerator extends BaseImageGenerator {
  private client: OpenAI
  private config: TuziConfig

  constructor(config: TuziConfig) {
    super()
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.tu-zi.com/v1',
      dangerouslyAllowBrowser: true
    })
  }

  async generateImages(taskId: string, options: ImageGenerationOptions): Promise<string[]> {
    try {
      this.emitProgress(taskId, 0, 'preparing', '准备生成图片...')

      const userMessages: ChatCompletionContentPart[] = [
        {
          type: 'text',
          text: this.buildPrompt(options)
        }
      ];
      if (options.attachedImages && options.attachedImages.length > 0) {
        const images = await Promise.all(
          options.attachedImages.map(async (image) => {
            return await this.fileToBase64(image)
          })
        );
        images.forEach((image) => {
          userMessages.push({
            type: 'image_url',
            image_url: {url: image}
          });
        });
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: userMessages
        }
      ]

      const stream = await this.client.chat.completions.create({
        model: options.model || this.config.model || 'gpt-4o-image',
        messages,
        stream: true
      })

      const imageUrls: string[] = []
      let fullContent = ''

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          await this.processStreamContent(taskId, content, imageUrls)
        }
      }

      // Process any remaining content
      if (fullContent && imageUrls.length === 0) {
        await this.processStreamContent(taskId, fullContent, imageUrls)
      }

      if (imageUrls.length === 0) {
        throw new Error('No images generated')
      }

      this.emitProgress(taskId, 100, 'completed', '生成完成')
      this.emitComplete(taskId, imageUrls, true)
      return imageUrls

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emitProgress(taskId, 0, 'error', `生成失败: ${errorMessage}`)
      this.emitComplete(taskId, [], false, errorMessage)
      throw error
    }
  }

  private buildPrompt(options: ImageGenerationOptions): string {
    let prompt = options.prompt + "\n 生成4张";
    return prompt
  }

  private async processStreamContent(taskId: string, content: string, imageUrls: string[]): Promise<void> {
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      await this.processStreamLine(taskId, trimmedLine, imageUrls)
    }
  }

  private async processStreamLine(taskId: string, line: string, imageUrls: string[]): Promise<void> {
    // Handle queue status
    if (line.includes('排队中')) {
      this.emitProgress(taskId, 5, 'preparing', '排队中...')
      return
    }

    // Handle generation status
    if (line.includes('生成中')) {
      this.emitProgress(taskId, 10, 'generating', '生成中...')
      return
    }

    // Handle progress updates
    const progressMatch = line.match(/进度\s*(\d+)/) || line.match(/^(\d+)\.\./)
    if (progressMatch) {
      const progress = parseInt(progressMatch[1])
      this.emitProgress(taskId, Math.min(progress, 99), 'generating', `生成进度: ${progress}%`)
      return
    }

    // Handle completion with image URLs
    const urlMatch = line.match(/\[点击下载\]\((https?:\/\/[^\s)]+)\)/)
    if (urlMatch) {
      const imageUrl = urlMatch[1]
      if (imageUrl && !imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl)
        this.emitProgress(taskId, 95, 'processing', `获取图片: ${imageUrls.length}`)
      }
      return
    }

    // Handle completion message
    if (line.includes('生成完成')) {
      this.emitProgress(taskId, 100, 'completed', '生成完成')
      return
    }
  }
}
