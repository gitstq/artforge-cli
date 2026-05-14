/**
 * 配置管理命令
 * Configuration Management Command
 */

import { loadConfig, saveConfig } from '../utils/workspace.js';
import { logger } from '../utils/logger.js';

export async function configCommand(options) {
  try {
    const config = await loadConfig();
    
    // 列出所有配置
    if (options.list || (!options.set && !options.get)) {
      logger.header('⚙️  当前配置');
      
      logger.section('提供商设置');
      Object.entries(config.providers).forEach(([name, provider]) => {
        const status = provider.enabled ? chalk.green('✓ 启用') : chalk.gray('✗ 禁用');
        console.log(`  ${chalk.cyan(name)}: ${status}`);
        if (provider.apiKey) {
          const maskedKey = provider.apiKey.slice(0, 4) + '****' + provider.apiKey.slice(-4);
          console.log(`    API Key: ${maskedKey}`);
        }
      });
      
      logger.section('默认参数');
      logger.table(config.defaults);
      
      logger.section('图库设置');
      logger.table(config.gallery);
      
      console.log(chalk.gray('\n💡 提示: 使用 --set key=value 修改配置'));
      return;
    }
    
    // 获取配置项
    if (options.get) {
      const keys = options.get.split('.');
      let value = config;
      
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) break;
      }
      
      if (value !== undefined) {
        console.log(`${options.get} = ${JSON.stringify(value, null, 2)}`);
      } else {
        logger.error(`配置项 ${options.get} 不存在`);
      }
      return;
    }
    
    // 设置配置项
    if (options.set) {
      const [keyPath, value] = options.set.split('=');
      if (!keyPath || value === undefined) {
        logger.error('格式错误，请使用: --set key=value');
        return;
      }
      
      const keys = keyPath.split('.');
      let target = config;
      
      // 遍历并创建嵌套对象
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }
      
      // 解析值类型
      const lastKey = keys[keys.length - 1];
      let parsedValue = value;
      
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(value) && value !== '') parsedValue = Number(value);
      
      target[lastKey] = parsedValue;
      
      await saveConfig(config);
      logger.success(`已设置: ${keyPath} = ${parsedValue}`);
    }
    
  } catch (error) {
    logger.error(`配置操作失败: ${error.message}`);
  }
}