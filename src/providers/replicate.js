/**
 * Replicate 提供商适配器
 * Replicate Provider Adapter
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

export class ReplicateProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = 'https://api.replicate.com/v1';
  }

  /**
   * 获取可用模型列表
   */
  async listModels() {
    if (!this.apiKey) {
      logger.warning('未配置 Replicate API Key');
      return [];
    }

    try {
      const response = await axios.get(`${this.baseURL}/collections/flux`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`
        }
      });
      
      return response.data.models || [];
    } catch (error) {
      logger.error(`获取 Replicate 模型失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 生成图像
   */
  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: '未配置 Replicate API Key' };
    }

    const model = options.model || 'black-forest-labs/flux-schnell';
    
    try {
      // 创建预测
      const createResponse = await axios.post(
        `${this.baseURL}/predictions`,
        {
          version: model,
          input: {
            prompt: prompt,
            width: parseInt(options.width) || 1024,
            height: parseInt(options.height) || 1024,
            seed: options.seed ? parseInt(options.seed) : undefined,
            num_inference_steps: parseInt(options.steps) || 4
          }
        },
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const prediction = createResponse.data;
      
      // 轮询等待结果
      let result = await this.pollPrediction(prediction.id);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  /**
   * 轮询预测结果
   */
  async pollPrediction(predictionId, maxAttempts = 60) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.baseURL}/predictions/${predictionId}`,
          {
            headers: {
              'Authorization': `Token ${this.apiKey}`
            }
          }
        );

        const prediction = response.data;
        
        if (prediction.status === 'succeeded') {
          return {
            success: true,
            imageUrl: prediction.output,
            seed: prediction.input.seed
          };
        } else if (prediction.status === 'failed') {
          return {
            success: false,
            error: prediction.error || '生成失败'
          };
        }
        
        // 等待 1 秒后重试
        await delay(1000);
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
    
    return {
      success: false,
      error: '生成超时，请稍后重试'
    };
  }

  /**
   * 获取提供商信息
   */
  getInfo() {
    return {
      name: 'Replicate',
      description: '云端AI模型托管平台',
      requiresAPIKey: true,
      supportsImageGeneration: true,
      models: [
        'black-forest-labs/flux-schnell',
        'black-forest-labs/flux-dev',
        'stability-ai/stable-diffusion-3'
      ]
    };
  }
}