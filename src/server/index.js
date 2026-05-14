/**
 * Web 服务器
 * Web Server
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { loadConfig, getGalleryDir, getOutputDir } from '../utils/workspace.js';
import { OllamaProvider } from '../providers/ollama.js';
import { ReplicateProvider } from '../providers/replicate.js';
import { OpenAIProvider } from '../providers/openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer(port = 3456, host = 'localhost') {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  
  // 中间件
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../../public')));
  
  // API 路由
  app.get('/api/config', async (req, res) => {
    const config = await loadConfig();
    // 返回安全的配置（隐藏 API Key）
    const safeConfig = {
      providers: {
        ollama: { enabled: config.providers.ollama?.enabled },
        replicate: { enabled: config.providers.replicate?.enabled },
        openai: { enabled: config.providers.openai?.enabled }
      },
      defaults: config.defaults
    };
    res.json(safeConfig);
  });
  
  app.get('/api/models', async (req, res) => {
    try {
      const config = await loadConfig();
      const models = [];
      
      // Ollama 模型
      if (config.providers.ollama?.enabled) {
        const ollama = new OllamaProvider(config.providers.ollama);
        const ollamaModels = await ollama.listModels();
        models.push(...ollamaModels.map(m => ({
          id: `ollama/${m.name}`,
          name: m.name,
          provider: 'ollama'
        })));
      }
      
      // Replicate 模型
      if (config.providers.replicate?.enabled) {
        models.push(
          { id: 'replicate/flux-schnell', name: 'Flux Schnell', provider: 'replicate' },
          { id: 'replicate/flux-dev', name: 'Flux Dev', provider: 'replicate' }
        );
      }
      
      // OpenAI 模型
      if (config.providers.openai?.enabled) {
        models.push(
          { id: 'openai/dall-e-3', name: 'DALL-E 3', provider: 'openai' },
          { id: 'openai/dall-e-2', name: 'DALL-E 2', provider: 'openai' }
        );
      }
      
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/generate', async (req, res) => {
    try {
      const { prompt, model, width, height, steps, seed } = req.body;
      const config = await loadConfig();
      
      // 解析模型提供商
      const [providerName, modelName] = model.split('/');
      
      let result;
      switch (providerName) {
        case 'replicate':
          const replicate = new ReplicateProvider(config.providers.replicate);
          result = await replicate.generateImage(prompt, { 
            model: modelName, width, height, steps, seed 
          });
          break;
        case 'openai':
          const openai = new OpenAIProvider(config.providers.openai);
          result = await openai.generateImage(prompt, { 
            model: modelName, width, height 
          });
          break;
        default:
          return res.status(400).json({ error: '不支持的提供商' });
      }
      
      if (result.success) {
        res.json({ 
          success: true, 
          imageUrl: result.imageUrl,
          seed: result.seed 
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/gallery', async (req, res) => {
    try {
      const galleryDir = getGalleryDir();
      const files = await fs.readdir(galleryDir);
      const images = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) continue;
        
        const metadataPath = path.join(galleryDir, `${file}.json`);
        let metadata = null;
        
        if (await fs.pathExists(metadataPath)) {
          metadata = await fs.readJson(metadataPath);
        }
        
        images.push({
          filename: file,
          metadata: metadata,
          url: `/gallery/${file}`
        });
      }
      
      // 按时间倒序
      images.sort((a, b) => {
        const timeA = a.metadata?.createdAt || 0;
        const timeB = b.metadata?.createdAt || 0;
        return new Date(timeB) - new Date(timeA);
      });
      
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // 静态文件服务 - 图库
  app.use('/gallery', express.static(getGalleryDir()));
  
  // 主页
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
  
  // WebSocket 连接处理
  wss.on('connection', (ws) => {
    console.log(chalk.blue('🔌 WebSocket 客户端已连接'));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'generate') {
          // 广播生成进度
          ws.send(JSON.stringify({ type: 'progress', message: '正在生成...' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });
    
    ws.on('close', () => {
      console.log(chalk.gray('🔌 WebSocket 客户端已断开'));
    });
  });
  
  // 启动服务器
  server.listen(port, host, () => {
    console.log(chalk.green(`\n🚀 ArtForge 服务器已启动`));
    console.log(chalk.blue(`   本地访问: http://${host}:${port}`));
    console.log(chalk.gray(`   按 Ctrl+C 停止服务器\n`));
  });
  
  return server;
}