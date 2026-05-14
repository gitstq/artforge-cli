#!/usr/bin/env node

/**
 * ArtForge Local - 轻量级本地AI图像生成与管理工具
 * Lightweight Local AI Image Generation & Management Tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { startServer } from './server/index.js';
import { generateImage } from './commands/generate.js';
import { listModels } from './commands/models.js';
import { galleryCommand } from './commands/gallery.js';
import { configCommand } from './commands/config.js';
import { initWorkspace } from './utils/workspace.js';

const program = new Command();

program
  .name('artforge')
  .description('轻量级本地AI图像生成与管理工具\nLightweight Local AI Image Generation & Management Tool')
  .version('1.0.0');

program
  .command('init')
  .description('初始化工作空间 | Initialize workspace')
  .action(async () => {
    console.log(chalk.blue('🚀 初始化 ArtForge 工作空间...'));
    await initWorkspace();
    console.log(chalk.green('✅ 工作空间初始化完成！'));
  });

program
  .command('serve')
  .description('启动Web服务 | Start web server')
  .option('-p, --port <port>', '端口号 | Port number', '3456')
  .option('-h, --host <host>', '主机地址 | Host address', 'localhost')
  .action(async (options) => {
    await startServer(parseInt(options.port), options.host);
  });

program
  .command('generate')
  .alias('gen')
  .description('生成图像 | Generate image')
  .requiredOption('-p, --prompt <prompt>', '提示词 | Prompt text')
  .option('-m, --model <model>', '模型名称 | Model name', 'ollama/llava')
  .option('-w, --width <width>', '图像宽度 | Image width', '1024')
  .option('-h, --height <height>', '图像高度 | Image height', '1024')
  .option('-s, --steps <steps>', '推理步数 | Inference steps', '20')
  .option('-o, --output <output>', '输出路径 | Output path')
  .option('--seed <seed>', '随机种子 | Random seed')
  .action(async (options) => {
    await generateImage(options);
  });

program
  .command('models')
  .description('列出可用模型 | List available models')
  .option('-p, --provider <provider>', '服务提供商 | Service provider')
  .action(async (options) => {
    await listModels(options);
  });

program
  .command('gallery')
  .description('管理图像库 | Manage image gallery')
  .option('-l, --list', '列出所有图像 | List all images')
  .option('-d, --delete <id>', '删除指定图像 | Delete image by ID')
  .option('-e, --export <path>', '导出图像 | Export images to path')
  .action(async (options) => {
    await galleryCommand(options);
  });

program
  .command('config')
  .description('配置管理 | Configuration management')
  .option('-s, --set <key=value>', '设置配置项 | Set config value')
  .option('-g, --get <key>', '获取配置项 | Get config value')
  .option('-l, --list', '列出所有配置 | List all configs')
  .action(async (options) => {
    await configCommand(options);
  });

// 默认显示帮助
if (process.argv.length === 2) {
  program.help();
}

program.parse();