/**
 * OpenAI 提供商适配器
 * OpenAI Provider Adapter
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

export class OpenAIProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  /**
   * 生成图像 (DALL-E)
   */
  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: '未配置 OpenAI API Key' };
    }

    const model = options.model || 'dall-e-3';
    const size = `${options.width || 1024}x${options.height || 1024}`;
    
    // DALL-E 支持的尺寸
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    const finalSize = validSizes.includes(size) ? size : '1024x1024';
    
    try {
      const response = await axios.post(
        `${this.baseURL}/images/generations`,
        {
          model: model,
          prompt: prompt,
          size: finalSize,
          quality: options.quality || 'standard',
          n: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        imageUrl: response.data.data[0].url,
        revisedPrompt: response.data.data[0].revised_prompt
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * 优化提示词
   */
  async optimizePrompt(prompt) {
    if (!this.apiKey) {
      return { success: false, prompt };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的AI图像生成提示词优化专家。你的任务是优化用户提供的提示词，使其更加详细、生动、具有画面感，适合用于DALL-E、Midjourney、Flux等AI图像生成模型。只返回优化后的提示词，不要其他解释。'
            },
            {
              role: 'user',
              content: `请优化以下图像生成提示词："${prompt}"`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        prompt: response.data.choices[0].message.content.trim()
      };
    } catch (error) {
      logger.warning(`提示词优化失败: ${error.message}`);
      return { success: false, prompt };
    }
  }

  /**
   * 获取提供商信息
   */
  getInfo() {
    return {
      name: 'OpenAI',
      description: 'OpenAI API 服务',
      requiresAPIKey: true,
      supportsImageGeneration: true,
      models: ['dall-e-3', 'dall-e-2'],
      baseURL: this.baseURL
    };
  }
}