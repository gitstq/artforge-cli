/**
 * 工作空间管理工具
 * Workspace Management Utilities
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const WORKSPACE_DIR = path.join(os.homedir(), '.artforge');
const CONFIG_FILE = path.join(WORKSPACE_DIR, 'config.json');
const GALLERY_DIR = path.join(WORKSPACE_DIR, 'gallery');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');

const DEFAULT_CONFIG = {
  version: '1.0.0',
  providers: {
    ollama: {
      enabled: true,
      host: 'http://localhost:11434',
      defaultModel: 'llava'
    },
    openai: {
      enabled: false,
      apiKey: '',
      baseURL: 'https://api.openai.com/v1'
    },
    replicate: {
      enabled: false,
      apiKey: ''
    }
  },
  defaults: {
    width: 1024,
    height: 1024,
    steps: 20,
    seed: null
  },
  gallery: {
    autoSave: true,
    maxHistory: 100
  }
};

export async function initWorkspace() {
  try {
    // 创建工作空间目录
    await fs.ensureDir(WORKSPACE_DIR);
    await fs.ensureDir(GALLERY_DIR);
    await fs.ensureDir(OUTPUT_DIR);
    
    // 创建默认配置文件
    if (!await fs.pathExists(CONFIG_FILE)) {
      await fs.writeJson(CONFIG_FILE, DEFAULT_CONFIG, { spaces: 2 });
      console.log(chalk.green('📄 配置文件已创建'));
    }
    
    console.log(chalk.blue(`📁 工作空间位置: ${WORKSPACE_DIR}`));
    console.log(chalk.blue(`🖼️  图像库位置: ${GALLERY_DIR}`));
    console.log(chalk.blue(`📤 输出目录: ${OUTPUT_DIR}`));
    
    return WORKSPACE_DIR;
  } catch (error) {
    console.error(chalk.red('❌ 初始化失败:'), error.message);
    throw error;
  }
}

export function getWorkspaceDir() {
  return WORKSPACE_DIR;
}

export function getGalleryDir() {
  return GALLERY_DIR;
}

export function getOutputDir() {
  return OUTPUT_DIR;
}

export function getConfigPath() {
  return CONFIG_FILE;
}

export async function loadConfig() {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error(chalk.red('❌ 加载配置失败:'), error.message);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config) {
  try {
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    return true;
  } catch (error) {
    console.error(chalk.red('❌ 保存配置失败:'), error.message);
    return false;
  }
}

export async function ensureWorkspace() {
  if (!await fs.pathExists(WORKSPACE_DIR)) {
    console.log(chalk.yellow('⚠️  工作空间未初始化，正在自动初始化...'));
    await initWorkspace();
  }
}