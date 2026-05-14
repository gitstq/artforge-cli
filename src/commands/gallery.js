/**
 * 图库管理命令
 * Gallery Management Command
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getGalleryDir } from '../utils/workspace.js';
import { logger } from '../utils/logger.js';

export async function galleryCommand(options) {
  try {
    const galleryDir = getGalleryDir();
    await fs.ensureDir(galleryDir);
    
    // 列出所有图像
    if (options.list || (!options.delete && !options.export)) {
      await listGallery();
    }
    
    // 删除图像
    if (options.delete) {
      await deleteImage(options.delete);
    }
    
    // 导出图像
    if (options.export) {
      await exportGallery(options.export);
    }
    
  } catch (error) {
    logger.error(`图库操作失败: ${error.message}`);
  }
}

async function listGallery() {
  const galleryDir = getGalleryDir();
  const files = await fs.readdir(galleryDir);
  
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );
  
  logger.header(`🖼️  图库 (${imageFiles.length} 张图像)`);
  
  if (imageFiles.length === 0) {
    logger.info('图库为空，使用 artforge generate 生成图像');
    return;
  }
  
  // 读取元数据并显示
  const images = [];
  for (const file of imageFiles) {
    const metadataPath = path.join(galleryDir, `${file}.json`);
    let metadata = null;
    
    if (await fs.pathExists(metadataPath)) {
      metadata = await fs.readJson(metadataPath);
    }
    
    images.push({
      filename: file,
      metadata: metadata,
      path: path.join(galleryDir, file)
    });
  }
  
  // 按时间倒序排列
  images.sort((a, b) => {
    const timeA = a.metadata?.createdAt || 0;
    const timeB = b.metadata?.createdAt || 0;
    return new Date(timeB) - new Date(timeA);
  });
  
  images.forEach((img, index) => {
    const meta = img.metadata;
    const id = meta?.id?.slice(0, 8) || 'unknown';
    const prompt = meta?.originalPrompt?.slice(0, 40) || '无提示词';
    const date = meta?.createdAt 
      ? new Date(meta.createdAt).toLocaleDateString() 
      : '未知日期';
    
    console.log(`\n  ${chalk.cyan(`${index + 1}.`)} ${chalk.white(img.filename)}`);
    console.log(`     ${chalk.gray('ID:')} ${id}`);
    console.log(`     ${chalk.gray('提示词:')} ${prompt}${meta?.originalPrompt?.length > 40 ? '...' : ''}`);
    console.log(`     ${chalk.gray('日期:')} ${date}`);
    if (meta?.provider) {
      console.log(`     ${chalk.gray('提供商:')} ${meta.provider}`);
    }
  });
  
  console.log(chalk.gray('\n💡 提示: 使用 --delete <id> 删除图像，--export <path> 导出全部'));
}

async function deleteImage(id) {
  const galleryDir = getGalleryDir();
  const files = await fs.readdir(galleryDir);
  
  // 查找匹配的图像
  let targetFile = null;
  let targetMetadata = null;
  
  for (const file of files) {
    if (file.endsWith('.json')) continue;
    
    const metadataPath = path.join(galleryDir, `${file}.json`);
    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      if (metadata.id?.startsWith(id) || file.includes(id)) {
        targetFile = file;
        targetMetadata = metadataPath;
        break;
      }
    }
  }
  
  if (!targetFile) {
    logger.error(`未找到 ID 为 ${id} 的图像`);
    return;
  }
  
  // 删除文件
  await fs.remove(path.join(galleryDir, targetFile));
  if (targetMetadata) {
    await fs.remove(targetMetadata);
  }
  
  logger.success(`已删除: ${targetFile}`);
}

async function exportGallery(exportPath) {
  const galleryDir = getGalleryDir();
  const files = await fs.readdir(galleryDir);
  const imageFiles = files.filter(f => 
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  );
  
  if (imageFiles.length === 0) {
    logger.warning('图库为空，无可导出图像');
    return;
  }
  
  await fs.ensureDir(exportPath);
  
  logger.progress(`正在导出 ${imageFiles.length} 张图像`);
  
  for (const file of imageFiles) {
    const srcPath = path.join(galleryDir, file);
    const destPath = path.join(exportPath, file);
    await fs.copy(srcPath, destPath);
  }
  
  logger.done();
  logger.success(`已导出到: ${exportPath}`);
}