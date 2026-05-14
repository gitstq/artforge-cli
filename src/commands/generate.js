/**
 * 图像生成命令
 * Image Generation Command
 */

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig, getOutputDir, getGalleryDir } from '../utils/workspace.js';
import { logger } from '../utils/logger.js';
import { OllamaProvider } from '../providers/ollama.js';
import { ReplicateProvider } from '../providers/replicate.js';
import { OpenAIProvider } from '../providers/openai.js';

export async function generateImage(options) {
  try {
    const config = await loadConfig();
    const { prompt, model, width, height, steps, output, seed } = options;
    
    logger.header('🎨 图像生成');
    logger.info(`原始提示词: ${prompt}`);
    
    // 解析模型提供商
    const [providerName, modelName] = model.includes('/') 
      ? model.split('/') 
      : ['ollama', model];
    
    // 优化提示词
    let optimizedPrompt = prompt;
    if (config.providers.ollama?.enabled) {
      logger.progress('正在优化提示词');
      const ollama = new OllamaProvider(config.providers.ollama);
      const result = await ollama.generatePrompt(prompt);
      if (result.success) {
        optimizedPrompt = result.prompt;
        logger.done();
        logger.info(`优化后提示词: ${optimizedPrompt}`);
      }
    }
    
    // 生成图像
    let result;
    
    switch (providerName) {
      case 'replicate':
        result = await generateWithReplicate(optimizedPrompt, {
          ...options,
          model: modelName
        }, config);
        break;
      case 'openai':
        result = await generateWithOpenAI(optimizedPrompt, {
          ...options,
          model: modelName
        }, config);
        break;
      default:
        // 默认使用 Replicate 或提示用户配置
        logger.warning('未指定有效的图像生成提供商，尝试使用 Replicate...');
        result = await generateWithReplicate(optimizedPrompt, options, config);
    }
    
    if (!result.success) {
      logger.error(`生成失败: ${result.error}`);
      return;
    }
    
    // 下载并保存图像
    const imageId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `artforge_${timestamp}_${imageId.slice(0, 8)}.png`;
    
    const outputPath = output || path.join(getOutputDir(), filename);
    
    logger.progress('正在下载图像');
    await downloadImage(result.imageUrl, outputPath);
    logger.done();
    
    // 保存到图库
    if (config.gallery?.autoSave !== false) {
      const galleryPath = path.join(getGalleryDir(), filename);
      await fs.copy(outputPath, galleryPath);
      
      // 保存元数据
      const metadataPath = path.join(getGalleryDir(), `${filename}.json`);
      await fs.writeJson(metadataPath, {
        id: imageId,
        originalPrompt: prompt,
        optimizedPrompt: optimizedPrompt,
        provider: providerName,
        model: modelName,
        width: parseInt(width),
        height: parseInt(height),
        seed: result.seed || seed,
        createdAt: new Date().toISOString(),
        filename: filename
      });
    }
    
    logger.success(`图像已保存: ${outputPath}`);
    
    if (result.revisedPrompt) {
      logger.info(`修订提示词: ${result.revisedPrompt}`);
    }
    
  } catch (error) {
    logger.error(`生成过程出错: ${error.message}`);
  }
}

async function generateWithReplicate(prompt, options, config) {
  const provider = new ReplicateProvider(config.providers.replicate);
  return await provider.generateImage(prompt, options);
}

async function generateWithOpenAI(prompt, options, config) {
  const provider = new OpenAIProvider(config.providers.openai);
  return await provider.generateImage(prompt, options);
}

async function downloadImage(url, outputPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  await fs.ensureDir(path.dirname(outputPath));
  
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}