// src/services/llm/llmService.ts

import OpenAI from 'openai'

export interface LLMConfig {
  apiKey: string
  baseURL?: string
  modelName?: string
}

export interface CreateTasksOptions {
  mainPrompt: string
  uploadedImagesCount: number
}

export interface TaskPromptOriginal {
  prompt: string,
  attachment: string[]
}

export interface TaskPrompt {
  prompt: string,
  imageIndexs?: number[] // 可选，表示关联的图片索引
}

export class LLMService {
  private client: OpenAI
  private config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  updateConfig(config: LLMConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  async createTasksFromPrompt(options: CreateTasksOptions): Promise<TaskPrompt[]> {
    try {
      const { mainPrompt, uploadedImagesCount} = options
      const prompt = `根据###包裹的用户提示词创建批量生成图片任务，注意将用户的批量类词语转为“图n"风格的单项任务词语，n为单一任务中的参考图本地序号，直接用 json 输出，使用json codeblock包裹，示例
用户输入将所有图片转为吉卜力风格，上传了2张图片，文件名分别为0.png和1.png，生成的任务格式如下：
[{
"prompt": "把图1转为吉卜力风格",
"attachment": [0.png]
}，{
"prompt": "把图1转为吉卜力风格",
"attachment": [1.png]
}]

用户提供的文件列表为：[${Array.from({ length: uploadedImagesCount }, (_, i) => `${i}.png`).join(', ')}]，请确保每个任务都包含 prompt 字段，并且 attachment 字段包含对应的图片文件名。
用户提示词：
###
${mainPrompt}
###
`;

      const response = await this.client.chat.completions.create({
        model: this.config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 1,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      console.log('LLM response:', content)
      if (!content) {
        throw new Error('No response from LLM')
      }

      let parsedTasks: TaskPromptOriginal[]
      const trimedContent = content.replace(/```json|```/g, '').trim() // 移除代码块标记
      try {
        parsedTasks = JSON.parse(trimedContent)
      } catch (parseError) {
        // Fallback: try to extract JSON from the response
        const jsonMatch = trimedContent.match(/\[.*\]/s)
        if (jsonMatch) {
          parsedTasks = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse LLM response as JSON')
        }
      }

      // 验证返回的数据格式
      if (!Array.isArray(parsedTasks)) {
        throw new Error('LLM response is not an array')
      }

      // 确保每个任务都有 prompt 字段
      const validTasks = parsedTasks.filter(task => 
        task && typeof task === 'object' && typeof task.prompt === 'string' && task.prompt.trim()
      )

      if (validTasks.length === 0) {
        throw new Error('No valid tasks found in LLM response')
      }

      return validTasks.map(task => {
        const imageIndexs = task.attachment?.map((vImg) => parseInt(vImg.substring(0, vImg.length - 4))) || []
        return {
          prompt: task.prompt.trim(),
          imageIndexs: imageIndexs.length > 0 ? imageIndexs : undefined // 如果没有图片索引则不返回该字段
        }
      });
    } catch (error) {
      console.error('Error creating tasks from prompt:', error)
      throw new Error(`Failed to create tasks from prompt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async improvePrompt(originalPrompt: string): Promise<string> {
    try {
      const systemPrompt = `
You are an expert at creating detailed, high-quality prompts for AI image generation.

Given a user's original prompt, enhance it to be more detailed and specific for better image generation results.

Guidelines:
1. Keep the original intent and subject matter
2. Add specific details about style, lighting, composition, colors
3. Include technical photography terms if appropriate
4. Make it more descriptive and vivid
5. Ensure the prompt is still concise and focused

Return only the improved prompt, no additional text or explanation.`

      const response = await this.client.chat.completions.create({
        model: this.config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: originalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      const improvedPrompt = response.choices[0]?.message?.content?.trim()
      if (!improvedPrompt) {
        throw new Error('No response from LLM')
      }

      return improvedPrompt
    } catch (error) {
      console.error('Error improving prompt:', error)
      // 如果改进失败，返回原始提示词
      return originalPrompt
    }
  }
}
