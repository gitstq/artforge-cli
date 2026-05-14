/**
 * Ollama 提供商适配器
 * Ollama Provider Adapter
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

export class OllamaProvider {
  constructor(config) {
    this.host = config.host || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'llava';
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async checkConnection() {
    try {
      const response = await axios.get(`${this.host}/api/tags`, {
        timeout: 5000
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.code === 'ECONNREFUSED' 
          ? 'Ollama 服务未启动，请先运行 ollama serve' 
          : error.message 
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.host}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      logger.error(`获取模型列表失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 生成图像（通过 Ollama 的图像理解模型辅助生成提示词）
   */
  async generatePrompt(prompt, options = {}) {
    try {
      const model = options.model || this.defaultModel;
      
      const response = await axios.post(`${this.host}/api/generate`, {
        model: model,
        prompt: `优化以下图像生成提示词，使其更详细、更具描述性，适合用于AI图像生成。只返回优化后的提示词，不要其他解释：\n\n"${prompt}"`,
        stream: false
      });

      return {
        success: true,
        prompt: response.data.response?.trim() || prompt,
        model: model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        prompt: prompt
      };
    }
  }

  /**
   * 获取提供商信息
   */
  getInfo() {
    return {
      name: 'Ollama',
      description: '本地大语言模型服务',
      host: this.host,
      requiresAPIKey: false,
      supportsImageGeneration: false,
      supportsPromptOptimization: true
    };
  }
}