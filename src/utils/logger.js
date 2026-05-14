/**
 * 日志工具
 * Logger Utilities
 */

import chalk from 'chalk';

export const logger = {
  info: (message) => console.log(chalk.blue('ℹ️ '), message),
  success: (message) => console.log(chalk.green('✅'), message),
  error: (message) => console.log(chalk.red('❌'), message),
  warning: (message) => console.log(chalk.yellow('⚠️ '), message),
  debug: (message) => console.log(chalk.gray('🐛'), message),
  
  // 带标题的日志
  header: (title) => console.log(chalk.cyan.bold(`\n═══ ${title} ═══\n`)),
  section: (title) => console.log(chalk.magenta.bold(`\n▸ ${title}`)),
  
  // 进度日志
  progress: (message) => process.stdout.write(chalk.blue(`⏳ ${message}... `)),
  done: () => console.log(chalk.green('完成')),
  
  // 表格格式化
  table: (data) => {
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`  ${chalk.gray(paddedKey)} : ${chalk.white(value)}`);
    });
  }
};