#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { generateBackend } from './src/generator.js';
import { validateConfig } from './src/validator.js';

console.log(chalk.blue.bold('🚀 Dynamic Backend Generator'));
console.log(chalk.gray('Generate a complete backend with your preferred stack\n'));

const questions = [
  {
    type: 'input',
    name: 'projectName',
    message: 'Project name:',
    default: 'my-backend-app',
    validate: (input) => {
      if (!input.trim()) return 'Project name is required';
      if (!/^[a-zA-Z0-9-_]+$/.test(input)) return 'Project name can only contain letters, numbers, hyphens, and underscores';
      return true;
    }
  },
  {
    type: 'list',
    name: 'framework',
    message: 'Choose framework:',
    choices: [
      { name: 'Express.js', value: 'express' },
      { name: 'Fastify', value: 'fastify' },
      { name: 'Koa.js', value: 'koa' }
    ],
    default: 'express'
  },
  {
    type: 'list',
    name: 'database',
    message: 'Choose database:',
    choices: [
      { name: 'MongoDB (with Mongoose)', value: 'mongodb' },
      { name: 'PostgreSQL (with Prisma)', value: 'postgresql' },
      { name: 'MySQL (with Prisma)', value: 'mysql' },
      { name: 'SQLite (with Prisma)', value: 'sqlite' }
    ],
    default: 'mongodb'
  },
  {
    type: 'checkbox',
    name: 'features',
    message: 'Select features:',
    choices: [
      { name: 'JWT Authentication', value: 'jwt', checked: true },
      { name: 'Email verification with OTP', value: 'otp', checked: true },
      { name: 'Redis for session management', value: 'redis', checked: true },
      { name: 'Rate limiting', value: 'rateLimit', checked: true },
      { name: 'Password reset', value: 'passwordReset', checked: true },
      { name: 'File uploads', value: 'uploads' },
      { name: 'API documentation (Swagger)', value: 'docs' },
      { name: 'Logging system', value: 'logging', checked: true },
      { name: 'Input validation', value: 'validation', checked: true },
      { name: 'CORS configuration', value: 'cors', checked: true },
      { name: 'Security headers (Helmet)', value: 'helmet', checked: true }
    ]
  },
  {
    type: 'list',
    name: 'emailService',
    message: 'Choose email service:',
    choices: [
      { name: 'Mailtrap (Development)', value: 'mailtrap' },
      { name: 'Resend (Production)', value: 'resend' },
      { name: 'Nodemailer (SMTP)', value: 'nodemailer' },
      { name: 'Skip email configuration', value: 'none' }
    ],
    default: 'mailtrap',
    when: (answers) => answers.features.includes('otp') || answers.features.includes('passwordReset')
  },
  {
    type: 'confirm',
    name: 'includeFrontend',
    message: 'Generate matching frontend?',
    default: true
  },
  {
    type: 'list',
    name: 'frontendFramework',
    message: 'Choose frontend framework:',
    choices: [
      { name: 'React with Vite', value: 'react-vite' },
      { name: 'Next.js', value: 'nextjs' },
      { name: 'Vue.js', value: 'vue' },
      { name: 'No frontend', value: 'none' }
    ],
    default: 'react-vite',
    when: (answers) => answers.includeFrontend
  }
];

async function main() {
  try {
    const answers = await inquirer.prompt(questions);
    
    // Validate configuration
    const validation = validateConfig(answers);
    if (!validation.valid) {
      console.error(chalk.red('❌ Configuration Error:'));
      validation.errors.forEach(error => console.error(chalk.red(`  • ${error}`)));
      process.exit(1);
    }

    console.log(chalk.yellow('\n📝 Configuration Summary:'));
    console.log(chalk.gray(`Project: ${answers.projectName}`));
    console.log(chalk.gray(`Framework: ${answers.framework}`));
    console.log(chalk.gray(`Database: ${answers.database}`));
    console.log(chalk.gray(`Features: ${answers.features.join(', ')}`));
    if (answers.emailService !== 'none') {
      console.log(chalk.gray(`Email: ${answers.emailService}`));
    }
    if (answers.includeFrontend) {
      console.log(chalk.gray(`Frontend: ${answers.frontendFramework}`));
    }

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with generation?',
        default: true
      }
    ]);

    if (!confirm.proceed) {
      console.log(chalk.yellow('❌ Generation cancelled'));
      process.exit(0);
    }

    console.log(chalk.blue('\n🔧 Generating backend...'));
    await generateBackend(answers);
    
    console.log(chalk.green.bold('\n✅ Backend generated successfully!'));
    console.log(chalk.cyan(`\n📁 Project created: ./${answers.projectName}`));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray(`  cd ${answers.projectName}`));
    console.log(chalk.gray('  npm install'));
    console.log(chalk.gray('  cp .env.example .env'));
    console.log(chalk.gray('  # Edit .env with your configuration'));
    console.log(chalk.gray('  npm run dev'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error generating backend:'), error.message);
    process.exit(1);
  }
}

main();