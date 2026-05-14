/**
 * 模型列表命令
 * Models List Command
 */

import chalk from 'chalk';
import { loadConfig } from '../utils/workspace.js';
import { logger } from '../utils/logger.js';
import { OllamaProvider } from '../providers/ollama.js';
import { ReplicateProvider } from '../providers/replicate.js';
import { OpenAIProvider } from '../providers/openai.js';

export async function listModels(options) {
  try {
    const config = await loadConfig();
    
    logger.header('🤖 可用模型列表');
    
    // Ollama 模型
    if (!options.provider || options.provider === 'ollama') {
      logger.section('Ollama (本地模型)');
      if (config.providers.ollama?.enabled) {
        const ollama = new OllamaProvider(config.providers.ollama);
        const connection = await ollama.checkConnection();
        
        if (connection.success) {
          const models = await ollama.listModels();
          if (models.length > 0) {
            models.forEach(model => {
              const isDefault = model.name === config.providers.ollama.defaultModel;
              const marker = isDefault ? chalk.green(' [默认]') : '';
              console.log(`  ${chalk.cyan('●')} ${model.name}${marker}`);
              if (model.details) {
                console.log(`    ${chalk.gray(`参数: ${model.details.parameter_size || '未知'}`)}`);
              }
            });
          } else {
            logger.info('未找到本地模型，请运行: ollama pull llava');
          }
        } else {
          logger.warning(connection.error);
          logger.info('安装 Ollama: https://ollama.com');
        }
      } else {
        logger.info('Ollama 未启用');
      }
    }
    
    // Replicate 模型
    if (!options.provider || options.provider === 'replicate') {
      logger.section('Replicate (云端模型)');
      if (config.providers.replicate?.enabled && config.providers.replicate?.apiKey) {
        const replicate = new ReplicateProvider(config.providers.replicate);
        const info = replicate.getInfo();
        info.models.forEach(model => {
          console.log(`  ${chalk.cyan('●')} ${model}`);
        });
      } else {
        logger.info('Replicate 未配置 API Key');
        logger.info('配置方法: artforge config --set replicate.apiKey=your_key');
      }
    }
    
    // OpenAI 模型
    if (!options.provider || options.provider === 'openai') {
      logger.section('OpenAI (云端模型)');
      if (config.providers.openai?.enabled && config.providers.openai?.apiKey) {
        const openai = new OpenAIProvider(config.providers.openai);
        const info = openai.getInfo();
        info.models.forEach(model => {
          console.log(`  ${chalk.cyan('●')} ${model}`);
        });
      } else {
        logger.info('OpenAI 未配置 API Key');
        logger.info('配置方法: artforge config --set openai.apiKey=your_key');
      }
    }
    
    console.log(chalk.gray('\n💡 提示: 使用 --provider 参数筛选特定提供商'));
    
  } catch (error) {
    logger.error(`获取模型列表失败: ${error.message}`);
  }
}