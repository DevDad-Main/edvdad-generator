import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import chalk from 'chalk';

// Register Handlebars helpers
Handlebars.registerHelper('camelCase', (str) => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
});

Handlebars.registerHelper('pascalCase', (str) => {
  return str.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase());
});

Handlebars.registerHelper('toLowerCase', (str) => {
  return str.toLowerCase();
});

Handlebars.registerHelper('eq', (a, b) => {
  return a === b;
});

Handlebars.registerHelper('ne', (a, b) => {
  return a !== b;
});

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('and', function() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

Handlebars.registerHelper('includes', (array, item) => {
  return array && array.includes(item);
});

export async function generateBackend(config) {
  const projectPath = path.resolve(process.cwd(), config.projectName);
  
  // Ensure we don't overwrite existing directory
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory '${config.projectName}' already exists`);
  }

  // Create project directory
  await fs.ensureDir(projectPath);

  // Generate files based on configuration
  await generatePackageJson(projectPath, config);
  await generateServerFiles(projectPath, config);
  await generateDatabaseFiles(projectPath, config);
  await generateAuthFiles(projectPath, config);
  await generateUtils(projectPath, config);
  await generateEnvironmentFile(projectPath, config);
  
  if (config.includeFrontend && config.frontendFramework !== 'none') {
    await generateFrontend(projectPath, config);
  }

  // Create README
  await generateReadme(projectPath, config);
}

async function generatePackageJson(projectPath, config) {
  const baseDependencies = {
    "express": "^5.2.1",
    "dotenv": "^17.2.3",
    "bcrypt": "^6.0.0",
    "jsonwebtoken": "^9.0.3",
    "helmet": "^8.1.0",
    "cors": "^2.8.6",
    "express-rate-limit": "^8.2.1",
    "express-validator": "^7.3.1",
    "cookie-parser": "^1.4.7",
    "devdad-express-utils": "^1.8.2"
  };

  const devDependencies = {
    "nodemon": "^3.1.11",
    "@types/node": "^20.14.2"
  };

  // Add database-specific dependencies
  if (config.database === 'mongodb') {
    Object.assign(baseDependencies, {
      "mongoose": "^9.1.5"
    });
  } else if (config.database !== 'sqlite') {
    Object.assign(baseDependencies, {
      "@prisma/client": "^5.22.0",
      "prisma": "^5.22.0"
    });
    Object.assign(devDependencies, {
      "@types/node": "^20.14.2"
    });
  }

  // Add feature-specific dependencies
  if (config.features.includes('redis')) {
    Object.assign(baseDependencies, {
      "ioredis": "^5.9.2",
      "rate-limit-redis": "^4.3.1",
      "rate-limiter-flexible": "^9.1.0"
    });
  }

  if (config.features.includes('otp') || config.features.includes('passwordReset')) {
    if (config.emailService === 'mailtrap') {
      Object.assign(baseDependencies, { "mailtrap": "^4.4.0" });
    } else if (config.emailService === 'resend') {
      Object.assign(baseDependencies, { "resend": "^6.9.1" });
    } else if (config.emailService === 'nodemailer') {
      Object.assign(baseDependencies, { "nodemailer": "^7.0.13" });
    }
  }

  if (config.features.includes('uploads')) {
    Object.assign(baseDependencies, {
      "multer": "^1.4.5-lts.1"
    });
    Object.assign(devDependencies, {
      "@types/multer": "^1.4.11"
    });
  }

  if (config.features.includes('docs')) {
    Object.assign(baseDependencies, {
      "swagger-jsdoc": "^6.2.8",
      "swagger-ui-express": "^5.0.0"
    });
    Object.assign(devDependencies, {
      "@types/swagger-jsdoc": "^6.0.4",
      "@types/swagger-ui-express": "^4.1.6"
    });
  }

  const packageJson = {
    name: config.projectName,
    version: "1.0.0",
    description: `Generated ${config.framework} backend with ${config.database}`,
    main: "src/server.js",
    type: "module",
    scripts: {
      start: "node src/server.js",
      dev: "nodemon src/server.js",
      ...(config.database !== 'mongodb' ? { "db:generate": "prisma generate" } : {}),
      ...(config.database !== 'mongodb' ? { "db:push": "prisma db push" } : {}),
      ...(config.database !== 'mongodb' ? { "db:migrate": "prisma migrate dev" } : {}),
      ...(config.database !== 'mongodb' ? { "db:studio": "prisma studio" } : {}),
    },
    keywords: ["backend", "api", "auth", config.framework, config.database],
    author: "",
    license: "ISC",
    dependencies: baseDependencies,
    devDependencies
  };

  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
  console.log(chalk.gray('✓ Generated package.json'));
}

async function generateServerFiles(projectPath, config) {
  const srcDir = path.join(projectPath, 'src');
  await fs.ensureDir(srcDir);

  // Generate server.js
  const serverTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/server.hbs'), 'utf8');
  const serverContent = Handlebars.compile(serverTemplate)(config);
  await fs.writeFile(path.join(srcDir, 'server.js'), serverContent);

  // Generate app.js
  const appTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/app.hbs'), 'utf8');
  const appContent = Handlebars.compile(appTemplate)(config);
  await fs.writeFile(path.join(srcDir, 'app.js'), appContent);

  console.log(chalk.gray('✓ Generated server files'));
}

async function generateDatabaseFiles(projectPath, config) {
  if (config.database === 'mongodb') {
    await generateMongooseFiles(projectPath, config);
  } else {
    await generatePrismaFiles(projectPath, config);
  }
  
  console.log(chalk.gray(`✓ Generated ${config.database} database files`));
}

async function generateMongooseFiles(projectPath, config) {
  const modelsDir = path.join(projectPath, 'src/models');
  await fs.ensureDir(modelsDir);

  // Generate User model
  const userTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/models/User.mongoose.hbs'), 'utf8');
  const userContent = Handlebars.compile(userTemplate)(config);
  await fs.writeFile(path.join(modelsDir, 'User.model.js'), userContent);

  // Generate RefreshToken model if JWT is enabled
  if (config.features.includes('jwt')) {
    const refreshTokenTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/models/RefreshToken.mongoose.hbs'), 'utf8');
    const refreshTokenContent = Handlebars.compile(refreshTokenTemplate)(config);
    await fs.writeFile(path.join(modelsDir, 'RefreshToken.model.js'), refreshTokenContent);
  }
}

async function generatePrismaFiles(projectPath, config) {
  // Generate Prisma schema
  const prismaDir = path.join(projectPath, 'prisma');
  await fs.ensureDir(prismaDir);

  const schemaTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/prisma/schema.hbs'), 'utf8');
  const schemaContent = Handlebars.compile(schemaTemplate)(config);
  await fs.writeFile(path.join(prismaDir, 'schema.prisma'), schemaContent);

  // Generate Prisma client utility
  const utilsDir = path.join(projectPath, 'src/utils');
  await fs.ensureDir(utilsDir);

  const prismaTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/utils/prisma.hbs'), 'utf8');
  const prismaContent = Handlebars.compile(prismaTemplate)(config);
  await fs.writeFile(path.join(utilsDir, 'prisma.js'), prismaContent);
}

async function generateAuthFiles(projectPath, config) {
  if (!config.features.includes('jwt')) return;

  const controllersDir = path.join(projectPath, 'src/controllers');
  const routesDir = path.join(projectPath, 'src/routes');
  const servicesDir = path.join(projectPath, 'src/services');
  const middlewareDir = path.join(projectPath, 'src/middleware');

  await fs.ensureDir(controllersDir);
  await fs.ensureDir(routesDir);
  await fs.ensureDir(servicesDir);
  await fs.ensureDir(middlewareDir);

  // Generate auth controller
  const authControllerTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/controllers/auth.hbs'), 'utf8');
  const authControllerContent = Handlebars.compile(authControllerTemplate)(config);
  await fs.writeFile(path.join(controllersDir, 'auth.controller.js'), authControllerContent);

  // Generate auth routes
  const authRoutesTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/routes/auth.hbs'), 'utf8');
  const authRoutesContent = Handlebars.compile(authRoutesTemplate)(config);
  await fs.writeFile(path.join(routesDir, 'auth.routes.js'), authRoutesContent);

  if (config.features.includes('otp') || config.features.includes('passwordReset')) {
    // Generate email service
    const emailTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/services/email.hbs'), 'utf8');
    const emailContent = Handlebars.compile(emailTemplate)(config);
    await fs.writeFile(path.join(servicesDir, 'email.service.js'), emailContent);
  }

  // Generate auth middleware
  const authMiddlewareTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/middleware/auth.hbs'), 'utf8');
  const authMiddlewareContent = Handlebars.compile(authMiddlewareTemplate)(config);
  await fs.writeFile(path.join(middlewareDir, 'auth.middleware.js'), authMiddlewareContent);

  console.log(chalk.gray('✓ Generated authentication files'));
}

async function generateUtils(projectPath, config) {
  const utilsDir = path.join(projectPath, 'src/utils');
  await fs.ensureDir(utilsDir);

  // Generate validation schemas (express-validator is not in Express Utils)
  if (config.features.includes('validation')) {
    const validationTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/utils/validation.hbs'), 'utf8');
    const validationContent = Handlebars.compile(validationTemplate)(config);
    await fs.writeFile(path.join(utilsDir, 'validation.js'), validationContent);
  }

  // Generate Redis client
  if (config.features.includes('redis')) {
    const redisTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/utils/redis.hbs'), 'utf8');
    const redisContent = Handlebars.compile(redisTemplate)(config);
    await fs.writeFile(path.join(utilsDir, 'redis.js'), redisContent);
  }

  console.log(chalk.gray('✓ Generated utility files'));
}

async function generateEnvironmentFile(projectPath, config) {
  const envTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/.env.example.hbs'), 'utf8');
  const envContent = Handlebars.compile(envTemplate)(config);
  await fs.writeFile(path.join(projectPath, '.env.example'), envContent);

  console.log(chalk.gray('✓ Generated environment file'));
}

async function generateFrontend(projectPath, config) {
  // For now, create a basic frontend structure
  const clientDir = path.join(projectPath, 'client');
  await fs.ensureDir(clientDir);

  // Create basic frontend package.json
  const frontendPackageJson = {
    name: `${config.projectName}-client`,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "axios": "^1.6.0"
    },
    devDependencies: {
      "vite": "^5.0.0"
    }
  };

  await fs.writeJSON(path.join(clientDir, 'package.json'), frontendPackageJson, { spaces: 2 });
  
  console.log(chalk.gray('✓ Generated frontend structure'));
}

async function generateReadme(projectPath, config) {
  const readmeTemplate = await fs.readFile(path.join(process.cwd(), 'src/templates/README.hbs'), 'utf8');
  const readmeContent = Handlebars.compile(readmeTemplate)(config);
  await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);

  console.log(chalk.gray('✓ Generated README.md'));
}