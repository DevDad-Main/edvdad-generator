import JSZip from 'jszip';

// Import saveAs dynamically for browser compatibility
const getSaveAs = async () => {
  if (typeof window !== 'undefined') {
    const { saveAs } = await import('file-saver');
    return saveAs;
  }
  return null;
};

// Sanitize project name for use in file names and configurations
const sanitizeProjectName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/--+/g, '-'); // Replace multiple hyphens with single
};

// Database configuration helpers
const getDatabaseService = (config) => {
  const services = {
    mongodb: {
      name: 'mongo',
      config: `mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped`,
      volumes: 'mongo_data'
    },
    postgresql: {
      name: 'postgres',
      config: `postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=${config.sanitizedName || 'devstack'}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped`,
      volumes: 'postgres_data'
    }
  };
  
  return services[config.database] || services.mongodb;
};

const getDatabaseEnvironment = (config) => {
  const environments = {
    mongodb: `- MONGO_URI=mongodb://mongo:27017/${config.sanitizedName || 'devstack'}`,
    postgresql: `- DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD:-postgres}@postgres:5432/${config.sanitizedName || 'devstack'}`
  };
  
  return environments[config.database] || environments.mongodb;
};

const getDatabaseORM = (config) => {
  return config.database === 'mongodb' ? 'mongoose' : 'prisma';
};

const generateDockerfile = (config) => `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "start"]
`;

const generateDockerCompose = (config) => {
  const databaseService = getDatabaseService(config);
  const databaseEnv = getDatabaseEnvironment(config);
  
  return `services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      ${databaseEnv}
      - REDIS_URL=redis://redis:6379
      - ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
      - JWT_SECRET=\${JWT_SECRET:-your-super-secret-jwt-key-here-at-least-32-characters}
      - JWT_ACCESS_EXPIRES_IN=15m
      - REFRESH_TOKEN_DAYS=7
      - MAILTRAP_API_KEY=\${MAILTRAP_API_KEY}
      - RESEND_API_KEY=\${RESEND_API_KEY}
      - RESEND_FROM=\${RESEND_FROM:-Your App <noreply@yourdomain.com>}
      - PASSWORD_MIN_LENGTH=8
      - PASSWORD_MAX_LENGTH=128
      - PASSWORD_MIN_UPPERCASE=1
      - PASSWORD_MIN_NUMBERS=1
      - PASSWORD_MIN_SYMBOLS=1
    depends_on:
      - ${databaseService.name}
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  ${databaseService.config}

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  ${databaseService.volumes}
  redis_data:
`;
};

// Prisma generation function for PostgreSQL
const generatePrismaSchema = (config) => `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  fullName    String
  lastLogin   DateTime @default(now())
  isVerified  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}
`;

const generatePrismaUtils = (config) => `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
`;

export const generateTemplate = async (config) => {
  const sanitizedName = sanitizeProjectName(config.projectName);
  const finalConfig = { ...config, sanitizedName };
  
  console.log('Generating template with config:', finalConfig);
  const zip = new JSZip();
  
  // Root files
  zip.file('README.md', generateReadme(finalConfig));
  zip.file('.gitignore', generateGitignore());

  // Docker files (if enabled)
  if (config.features?.docker) {
    zip.file('Dockerfile', generateDockerfile(finalConfig));
    zip.file('docker-compose.yml', generateDockerCompose(finalConfig));
  }

  // Server files
  const serverFolder = zip.folder('server');
  serverFolder.file('package.json', generateServerPackageJson(finalConfig));
  serverFolder.file('.env.example', generateServerEnv(finalConfig));
  
  const srcFolder = serverFolder.folder('src');
  srcFolder.file('app.js', generateAppJs(finalConfig));
  srcFolder.file('server.js', generateServerJs(finalConfig));
  
  // Routes
  const routesFolder = srcFolder.folder('routes');
  routesFolder.file('auth.routes.js', generateAuthRoutes(finalConfig));
  
  // Controllers
  const controllersFolder = srcFolder.folder('controllers');
  controllersFolder.file('auth.controller.js', generateAuthController(finalConfig));
  
  // Services
  const servicesFolder = srcFolder.folder('services');
  servicesFolder.file('auth.services.js', generateAuthServices(finalConfig));
  
  // Database-specific files (MongoDB & PostgreSQL only)
  if (config.database === 'mongodb') {
    const modelsFolder = srcFolder.folder('models');
    modelsFolder.file('User.model.js', generateUserModel(finalConfig));
    modelsFolder.file('RefreshToken.model.js', generateRefreshTokenModel());
  } else if (config.database === 'postgresql') {
    // Prisma files for PostgreSQL
    const prismaFolder = serverFolder.folder('prisma');
    prismaFolder.file('schema.prisma', generatePrismaSchema(finalConfig));
    
    const utilsFolder = srcFolder.folder('utils');
    utilsFolder.file('prisma.js', generatePrismaUtils(finalConfig));
  }
  
  // Utils
  const utilsFolder = srcFolder.folder('utils');
  utilsFolder.file('generateToken.utils.js', generateTokenUtils(finalConfig));
  utilsFolder.file('validation.utils.js', generateValidationUtils());
  utilsFolder.file('safeRegex.utils.js', generateSafeRegexUtils());
  utilsFolder.file('userAuthentication.utils.js', generateUserAuthUtils());
  utilsFolder.file('registrationSession.utils.js', generateRegistrationSessionUtils());
  utilsFolder.file('registrationCleanup.utils.js', generateRegistrationCleanupUtils());
  utilsFolder.file('clearRedisCache.utils.js', generateClearRedisCacheUtils());
  
  // Lib
  const libFolder = srcFolder.folder('lib');
  libFolder.file('redis.lib.js', generateRedisLib());
  libFolder.file('sendMail.lib.js', generateSendMailLib());
  
  // Middleware
  const middlewareFolder = srcFolder.folder('middleware');
  middlewareFolder.file('auth.middleware.js', generateAuthMiddlewareAdvanced());

  // Frontend files (if not API-only)
  if (config.frontend !== 'none') {
    const clientFolder = zip.folder('client');
    clientFolder.file('package.json', generateClientPackageJson(finalConfig));
    clientFolder.file('.env.example', 'VITE_API_URL=http://localhost:3000');
    clientFolder.file('vite.config.js', generateViteConfig());
    clientFolder.file('index.html', generateIndexHtml());
    clientFolder.file('tailwind.config.js', generateTailwindConfig());
    clientFolder.file('postcss.config.js', generatePostcssConfig());
    
    const clientSrcFolder = clientFolder.folder('src');
    clientSrcFolder.file('App.jsx', generateAppComponent(finalConfig));
    clientSrcFolder.file('main.jsx', generateMainFile(finalConfig));
    clientSrcFolder.file('index.css', generateClientCss());
    
    // Components
    const componentsFolder = clientSrcFolder.folder('components');
    componentsFolder.file('Login.jsx', generateLoginComponent(finalConfig));
    componentsFolder.file('Register.jsx', generateRegisterComponent(finalConfig));
    componentsFolder.file('VerifyEmail.jsx', generateVerifyEmailComponent());
    componentsFolder.file('Dashboard.jsx', generateDashboardComponent());
    
    // Utils
    const clientUtilsFolder = clientSrcFolder.folder('utils');
    clientUtilsFolder.file('api.js', generateClientUtils());
    clientUtilsFolder.file('passwordVisibility.jsx', generatePasswordVisibility());
    clientUtilsFolder.file('passwordValidation.jsx', generatePasswordValidation());
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const saveAs = await getSaveAs();
  if (saveAs) {
    saveAs(blob, `${config.sanitizedName || 'devstack'}-template.zip`);
  } else {
    // Fallback for Node.js testing
    console.log('Template generated successfully (no download in Node.js environment)');
  }
};

const generateReadme = (config) => {
  const backendNames = { express: 'Express', hono: 'Hono', fastify: 'Fastify', koa: 'Koa', nest: 'NestJS', elysia: 'Elysia' };
  const frontendNames = { react: 'React', vue: 'Vue.js', svelte: 'Svelte', nextjs: 'Next.js', nuxt: 'Nuxt', solid: 'SolidJS', astro: 'Astro', none: 'API Only' };

  return `# ${config.sanitizedName ? config.sanitizedName.charAt(0).toUpperCase() + config.sanitizedName.slice(1) : 'Advanced'} Authentication Server

A secure, modular Node.js authentication template with advanced security features.
**Powered by [devdad-express-utils](https://www.npmjs.com/package/devdad-express-utils)**

## Stack
- **Backend**: ${backendNames[config.backend] || 'Express'}
- **Frontend**: ${frontendNames[config.frontend] || 'None'}
- **Database**: ${config.database || 'MongoDB'}
- **Authentication**: JWT + Refresh Tokens + Email OTP Verification
- **ORM**: ${config.orm || 'Mongoose'}
${config.frontend !== 'none' ? `- **Styling**: ${config.styling || 'Tailwind CSS'}\n` : ''}- **Package Manager**: ${config.packageManager || 'npm'}

## Features

🔐 **Security First**
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 salt rounds)
- Email verification via OTP
- Rate limiting with Redis
- Input sanitization & validation (XSS, NoSQL Injection, HPP)
- Security headers with Helmet
- Gradual rate limiting with express-slow-down
- Response compression

🏗️ **Modern Architecture**
- Modular MVC structure
- ES6 modules
- Redis for session management
- MongoDB with Mongoose
- Comprehensive logging with Winston
- Graceful error handling

🛠️ **DevDad Express Utils**
This template uses \`devdad-express-utils\` for:
- \`sendSuccess()\` / \`sendError()\` - Standardized API responses
- \`catchAsync()\` - Async route error handling
- \`connectDB()\` - MongoDB connection with retries
- \`logger\` - Winston-based logging
- \`errorHandler\` - Global error middleware

## Quick Start

### Server
\`\`\`bash
cd server
${config.packageManager || 'npm'} install
cp .env.example .env
# Edit .env with your configuration
${config.packageManager || 'npm'} run dev
\`\`\`

${config.frontend !== 'none' ? `### Client
\`\`\`bash
cd client
${config.packageManager || 'npm'} install
${config.packageManager || 'npm'} run dev
\`\`\`

` : ''}## API Endpoints

### Public
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/verify-registration\` - Verify email with OTP
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/logout\` - User logout
- \`POST /api/auth/refresh-token\` - Refresh access token

## Security Features

- **Rate Limiting**: Prevents brute force attacks
- **Input Sanitization**: Blocks XSS and injection attempts
- **Password Policies**: Configurable security requirements
- **Session Management**: Secure Redis-based sessions
- **CORS Protection**: Configurable origin restrictions
- **NoSQL Injection Prevention**: mongoSanitize
- **HTTP Parameter Pollution Prevention**: hpp

## Project Structure

\`\`\`
server/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── lib/             # External libraries
│   ├── middleware/      # Auth middleware
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
└── .env.example         # Environment template
${config.frontend !== 'none' ? `
client/
├── src/
│   ├── components/      # React components
│   ├── utils/           # Client utilities
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
└── .env.example         # Client env template
` : ''}
\`\`\`

## License
MIT
`;
};

const generateGitignore = () => `node_modules
.env
dist
build
.DS_Store
*.log
coverage
`;

const generateAppJs = (config) => `import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { RateLimiterRedis } from "rate-limiter-flexible";
import redisClient from "./lib/redis.lib.js";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import slowDown from "express-slow-down";
import compression from "compression";

//#region Constants
const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173"];

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "advanced-auth-rate-limit-middleware",
  points: 10,
  duration: 1,
});

const expressEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next) => {
    logger.warn(\`Public API Rate Limit Exceeded for IP: \${req.ip}\`);
    return sendError(res, "Rate Limit Exceeded", 429);
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// Gradually slow down responses after certain threshold
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000,
});
//#endregion

//#region Middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit']
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true, limit: "3mb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(\`Rate Limit Exceeded for IP: \${req.ip}\`);
      return sendError(res, "Rate Limited Exceeded", 429);
    });
});
//#endregion

//#region EndPoints
app.use(speedLimiter);
app.use("/api/auth", (req, res, next) => {
  req.redisClient = redisClient;
  next();
}, authRouter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export default app;
`;

const generateServerJs = (config) => {
  const orm = getDatabaseORM(config);
  
  return `import { logger } from "devdad-express-utils";
import app from "./app.js";
${config.database === 'mongodb' ? `import { connectDB } from "devdad-express-utils";` : `import prisma from "./utils/prisma.js";`}
import { setupAutomaticCleanup } from "./utils/registrationCleanup.utils.js";

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    ${config.database === 'mongodb' ? 'await connectDB();' : 'await prisma.$connect();'}
    
    // Setup automatic registration session cleanup (every 30 minutes)
    const cleanupInterval = setupAutomaticCleanup(30);
    logger.info("Registration cleanup service started");

    app.listen(PORT, () => {
      logger.info(\`🚀 Server running on http://localhost:\${PORT}\`);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      if (cleanupInterval) clearInterval(cleanupInterval);
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});
`;
};

const generateAuthRoutes = (config) => `import { Router } from "express";
import { authenticationController } from "../controllers/auth.controller.js";
import { registerUserValidation, verifyUserRegisterValidation, loginUserValidation } from "../utils/validation.utils.js";

const authRouter = Router();

authRouter.post("/register", registerUserValidation, authenticationController.register);
authRouter.post("/verify-registration", verifyUserRegisterValidation, authenticationController.verifyUserOTP);
authRouter.post("/login", loginUserValidation, authenticationController.login);
authRouter.post("/logout", authenticationController.logout);
authRouter.post("/refresh-token", authenticationController.refreshToken);

export { authRouter };
`;

const generateServerEnv = (config) => {
  const databaseEnv = getDatabaseEnvironment(config);
  const orm = getDatabaseORM(config);
  
  return `# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
${databaseEnv}
# ORM: ${orm}

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_DAYS=7

# Redis Configuration
REDIS_URL=redis://localhost:6379

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Service Configuration
# Mailtrap (for development)
MAILTRAP_API_KEY=your-mailtrap-api-key

# Resend (for production)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=Your App <noreply@yourdomain.com>

# Password Requirements
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_MIN_UPPERCASE=1
PASSWORD_MIN_NUMBERS=1
PASSWORD_MIN_SYMBOLS=1
`;
};

const generateServerPackageJson = (config) => {
  const baseDependencies = {
    'bcrypt': '^6.0.0',
    'cookie-parser': '^1.4.7',
    'cors': '^2.8.5',
    'compression': '^1.7.4',
    'devdad-express-utils': '^1.8.2',
    'dotenv': '^16.3.1',
    'express': '^4.21.2',
    'express-rate-limit': '^8.2.1',
    'express-slow-down': '^2.0.3',
    'express-validator': '^7.3.1',
    'helmet': '^8.1.0',
    'hpp': '^0.2.3',
    'ioredis': '^5.9.2',
    'jsonwebtoken': '^9.0.3',
    'mailtrap': '^4.4.0',
    'nodemailer': '^7.0.13',
    'rate-limit-redis': '^4.3.1',
    'rate-limiter-flexible': '^9.1.0',
    'resend': '^6.9.1',
    'xss-clean': '^0.1.4'
  };

  // Add database-specific dependencies (MongoDB & PostgreSQL only)
  const databaseDependencies = {
    mongodb: {
      'mongoose': '^9.1.5',
      'express-mongo-sanitize': '^2.2.0'
    },
    postgresql: {
      '@prisma/client': '^5.22.0',
      'prisma': '^5.22.0'
    }
  };

  const devDependencies = {
    'nodemon': '^3.1.0'
  };

  // Add Prisma dev dependencies for PostgreSQL
  if (config.database === 'postgresql') {
    Object.assign(devDependencies, {
      '@types/node': '^20.14.2'
    });
  }

  const finalDependencies = {
    ...baseDependencies,
    ...databaseDependencies[config.database]
  };

  return JSON.stringify({
    name: config.sanitizedName || 'devstack-server',
    version: '1.0.0',
    type: 'module',
    main: 'src/server.js',
    scripts: {
      dev: 'nodemon src/server.js',
      start: 'node src/server.js',
      ...(config.database === 'postgresql' ? {
        'db:generate': 'prisma generate',
        'db:push': 'prisma db push',
        'db:migrate': 'prisma migrate dev',
        'db:studio': 'prisma studio'
      } : {})
    },
    dependencies: finalDependencies,
    devDependencies
  }, null, 2);
};

const generateAuthController = (config) => {
  const orm = getDatabaseORM(config);
  
  return `import { catchAsync, logger, sendError, sendSuccess } from "devdad-express-utils";
import { validationResult } from "express-validator";
${config.database === 'mongodb' ? 
  `import { User } from "../models/User.model.js";
import { RefreshToken } from "../models/RefreshToken.model.js";` :
  `import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();`
}
import { generateTokens } from "../utils/generateToken.utils.js";
import { authenticationService } from "../services/auth.services.js";

//#region Constants
const HTTP_OPTIONS = {
  httpOnly: process.env.NODE_ENV === "production",
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000,
};
//#endregion

export const authenticationController = {
  //#region Register
  register: catchAsync(async (req, res, next) => {
    const { email, password, firstName, lastName } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      logger.warn("Registration Validation Error", { errorMessages, email, firstName });
      return sendError(res, errorMessages.join(", "), 400);
    }

    const existingUser = ${config.database === 'mongodb' ? 
    'await User.findOne({ email });' :
    'await prisma.user.findUnique({ where: { email } });'
  }
    if (existingUser) {
      logger.warn("User Already Exists.", { email });
      return sendError(res, "User Already Exists", 400);
    }

    await authenticationService.checkUserOtpRestrictionsAndRequests(email, next);
    
    const userData = { firstName, lastName, email, password };
    const { registrationToken } = await authenticationService.storeUserDataInRedisAndCreateRegistrationToken(userData, next);
    
    const userFullName = \`\${firstName} \${lastName}\`;
    await authenticationService.sendUserOtp(userFullName, email, registrationToken, next);

    return sendSuccess(res, {
      registrationToken,
      message: "Please check your email for the verification code.",
      expiresIn: "30 minutes"
    }, "Registration initiated. Please verify your email.", 201);
  }),
  //#endregion

  //#region Verify OTP
  verifyUserOTP: catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      logger.warn("OTP Verification Validation Error", { errorMessages });
      return sendError(res, errorMessages.join(", "), 400);
    }

    const { registrationToken, otp } = req.body;
    const { registrationSession } = await authenticationService.retrieveUserRegistrationSession(registrationToken, next);
    
    const { userData } = registrationSession;
    const { firstName, lastName, email, password } = userData;
    const fullName = \`\${firstName} \${lastName}\`;

    await authenticationService.verifyUserViaOTPVerification(email, otp, registrationToken, next);
    const { user } = await authenticationService.createNewUserAndCleanUpCaches({ isVerified: true, email, fullName, password, registrationToken }, next);
    
    await authenticationService.sendUserWelcomeEmail(req, fullName, email, user._id);
    await authenticationService.deleteNewUserRegistrationSession(registrationToken);

    return sendSuccess(res, {
      user: { _id: user._id, fullName: user.fullName, email: user.email, isVerified: user.isVerified }
    }, "Registration completed successfully! Welcome aboard!", 201);
  }),
  //#endregion

  //#region Login
  login: catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      logger.warn("Login Validation Error: ", { errorMessages });
      return sendError(res, errorMessages.join(", "), 400);
    }

    const { user } = await authenticationService.fetchUserFromDB(email, password, next, res);
    if (!user) return;

    const { accessToken, refreshToken } = await generateTokens(user);

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: { _id: user._id, fullName: user.fullName }
    }, "Login Successful", 200, [
      (res) => res.cookie("accessToken", accessToken, HTTP_OPTIONS),
      (res) => res.cookie("refreshToken", refreshToken, HTTP_OPTIONS),
    ]);
  }),
  //#endregion

  //#region Logout User
  logout: catchAsync(async (req, res, next) => {
    return sendSuccess(res, {}, "Logout Successful", 200, [
      (res) => res.clearCookie("accessToken"),
      (res) => res.clearCookie("refreshToken"),
    ]);
  }),
  //#endregion

  //#region Refresh Token
  refreshToken: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn("Refresh token request missing token");
      return sendError(res, "Refresh token required", 400);
    }

    const storedToken = ${config.database === 'mongodb' ? 
    `await RefreshToken.findOne({ token: refreshToken }).populate('user');
    if (!storedToken) {
      logger.warn("Invalid refresh token attempted");
      return sendError(res, "Invalid refresh token", 401);
    }

    if (storedToken.expiresAt < new Date()) {
      logger.warn("Expired refresh token used", { tokenId: storedToken._id });
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return sendError(res, "Refresh token expired", 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(storedToken.user);
    await RefreshToken.deleteOne({ _id: storedToken._id });` :
    `await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });
    if (!storedToken) {
      logger.warn("Invalid refresh token attempted");
      return sendError(res, "Invalid refresh token", 401);
    }

    if (storedToken.expiresAt < new Date()) {
      logger.warn("Expired refresh token used", { tokenId: storedToken.id });
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return sendError(res, "Refresh token expired", 401);
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(storedToken.user);
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });`
  }

    return sendSuccess(res, { accessToken, refreshToken: newRefreshToken }, "Tokens refreshed successfully", 200);
  }),
  //#endregion
};
`;
};

const generateAuthServices = (config) => {
  const orm = getDatabaseORM(config);
  
  return `import { clearRedisUserCache } from "../utils/clearRedisCache.utils.js";
import { createRegistrationSession, deleteRegistrationSession, getRegistrationSession } from "../utils/registrationSession.utils.js";
import { checkOTPRestrictions, sendOTP, sendWelcomeEmail, trackOTPRequests, verifyOTP } from "../utils/userAuthentication.utils.js";
${config.database === 'mongodb' ? 'import { User } from "../models/User.model.js";' : 'import { PrismaClient } from "@prisma/client";'}
import { logger, sendError } from "devdad-express-utils";
import bcrypt from "bcrypt";

${config.database !== 'mongodb' ? 'const prisma = new PrismaClient();' : ''}

const SALT_ROUNDS = 12;

export const authenticationService = {
  async checkUserOtpRestrictionsAndRequests(email, next) {
    logger.info("Auth Service checking OTP Restrictions");
    try {
      await checkOTPRestrictions(email, next);
      await trackOTPRequests(email, next);
    } catch (error) {
      logger.error("OTP restrictions check failed", { email, error: error.message });
      next(error);
    }
  },

  async storeUserDataInRedisAndCreateRegistrationToken(userData, next) {
    logger.info("Auth Service storing user data in redis and generating token");
    try {
      const registrationToken = await createRegistrationSession(userData);
      logger.info("Registration session created", { registrationToken: registrationToken.substring(0, 8) + "..." });
      return { registrationToken };
    } catch (error) {
      logger.error("Failed to create registration session", { error: error.message });
      next(error);
    }
  },

  async sendUserOtp(userFullName, email, registrationToken, next) {
    logger.info("Auth Service generating OTP code and sending email", { email });
    try {
      await sendOTP(userFullName, email);
      logger.info("OTP sent successfully", { email });
    } catch (error) {
      await deleteRegistrationSession(registrationToken);
      logger.error("Failed to send OTP, session cleaned up", { email, error: error.message });
      next(error);
    }
  },

  async retrieveUserRegistrationSession(registrationToken, next) {
    try {
      const registrationSession = await getRegistrationSession(registrationToken);
      return { registrationSession };
    } catch (error) {
      logger.error("Failed to retrieve registration session", { error: error.message });
      next(error);
    }
  },

  async verifyUserViaOTPVerification(email, otp, registrationToken, next) {
    try {
      const isVerified = await verifyOTP(email, otp);
      logger.info("OTP verification successful", { email });
      return { isVerified };
    } catch (error) {
      logger.error("OTP verification failed", { email, error: error.message });
      next(error);
    }
  },

  async createNewUserAndCleanUpCaches({ isVerified, email, fullName, password, registrationToken }, next) {
    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      ${config.database === 'mongodb' ? 
        `const user = await User.create({ fullName, email, password: hashedPassword, isVerified });
        logger.info("User created successfully", { userId: user._id, email });` :
        `const user = await prisma.user.create({
          data: { fullName, email, password: hashedPassword, isVerified }
        });
        logger.info("User created successfully", { userId: user.id, email });`
      }
      return { user };
    } catch (error) {
      logger.error("Failed to create user", { email, error: error.message });
      await deleteRegistrationSession(registrationToken);
      next(error);
    }
  },

  async sendUserWelcomeEmail(req, fullName, email, _id) {
    try {
      await sendWelcomeEmail(fullName, email);
      await clearRedisUserCache(req, _id);
      logger.info("Post-registration tasks completed", { userId: _id });
    } catch (error) {
      logger.error("Post-registration tasks failed", { userId: _id, error: error.message });
    }
  },

  async deleteNewUserRegistrationSession(registrationToken) {
    try {
      await deleteRegistrationSession(registrationToken);
      logger.info("Registration session cleaned up");
    } catch (error) {
      logger.error("Failed to clean up registration session", { error: error.message });
    }
  },

  async fetchUserFromDB(email, password, next, res) {
    try {
      ${config.database === 'mongodb' ? 
        `const user = await User.findOne({ email });
        if (!user) {
          logger.warn("User Not Found: ", { email });
          return sendError(res, "User Not Found", 404);
        }
        
        const isPasswordMatching = await user.comparePassword(password);
        if (!isPasswordMatching) {
          logger.warn("Invalid Password");
          return sendError(res, "Invalid Password", 400);
        }
        return { user };` :
        `const user = await prisma.user.findUnique({
          where: { email }
        });
        if (!user) {
          logger.warn("User Not Found: ", { email });
          return sendError(res, "User Not Found", 404);
        }
        
        const isPasswordMatching = await bcrypt.compare(password, user.password);
        if (!isPasswordMatching) {
          logger.warn("Invalid Password");
          return sendError(res, "Invalid Password", 400);
        }
        return { user };`
      }
    } catch (error) {
      logger.error("Failed to fetch User", { error });
      next(error);
    }
  },
};
`;
};

const generateUserModel = (config) => `import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  lastLogin: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (passwordToCompare) {
  return await bcrypt.compare(passwordToCompare, this.password);
};

userSchema.index({ fullName: "text", email: "text" });

export const User = mongoose.model("User", userSchema);
`;

const generateRefreshTokenModel = () => `import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
`;

const generateTokenUtils = (config) => {
  const orm = getDatabaseORM(config);
  
  return `import jwt from "jsonwebtoken";
import crypto from "crypto";
${config.database === 'mongodb' ? 
  'import { RefreshToken } from "../models/RefreshToken.model.js";' :
  'import { PrismaClient } from "@prisma/client";\nconst prisma = new PrismaClient();'
}

export const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { userId: ${config.database === 'mongodb' ? 'user._id' : 'user.id'}, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

  const refreshTokenString = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(process.env.REFRESH_TOKEN_DAYS) || 7));

  ${config.database === 'mongodb' ? 
    'await RefreshToken.create({ token: refreshTokenString, user: user._id, expiresAt });' :
    'await prisma.refreshToken.create({\n  data: { token: refreshTokenString, userId: user.id, expiresAt }\n});'
  }

  return { accessToken, refreshToken: refreshTokenString };
};

export async function revokeAllUserTokens(userId) {
  return ${config.database === 'mongodb' ? 
    'await RefreshToken.deleteMany({ user: userId });' :
    'await prisma.refreshToken.deleteMany({ where: { userId } });'
  }
}
`;
};

const generateValidationUtils = (config) => `import ${config.database === 'mongodb' ? '{ User } from "../models/User.model.js";' : '{ PrismaClient } from "@prisma/client";\nconst prisma = new PrismaClient();'}
import { body } from "express-validator";
import { validateName, validateOTP, validatePassword } from "./safeRegex.utils.js";

export const registerUserValidation = [
  body("firstName").notEmpty().withMessage("First name is required.").trim().escape().custom(validateName),
  body("lastName").notEmpty().withMessage("Last name is required.").trim().escape().custom(validateName),
  body("email").notEmpty().withMessage("Email is required.").bail().isEmail().withMessage("Please enter a valid email address.")
    .custom(async (value) => {
      const user = ${config.database === 'mongodb' ? 
        'await User.findOne({ email: value });' :
        'await prisma.user.findUnique({ where: { email } });'
      }
      if (user) throw new Error("Email address already in use.");
    }).normalizeEmail().escape(),
  body("password").notEmpty().withMessage("Password is required.").custom(validatePassword)
    .isStrongPassword({
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
      minUppercase: parseInt(process.env.PASSWORD_MIN_UPPERCASE) || 1,
      minNumbers: parseInt(process.env.PASSWORD_MIN_NUMBERS) || 1,
      minSymbols: parseInt(process.env.PASSWORD_MIN_SYMBOLS) || 1,
    }).withMessage("Password must meet complexity requirements.").trim(),
];

export const verifyUserRegisterValidation = [
  body("registrationToken").notEmpty().withMessage("Registration token is required.").isString().isLength({ min: 64 }).withMessage("Invalid registration token format."),
  body("otp").notEmpty().withMessage("OTP is required.").isString().custom(validateOTP).withMessage("OTP must be a 4-digit number."),
];

export const loginUserValidation = [
  body("email").notEmpty().withMessage("Email can't be empty!").bail()
    .custom(async (value) => {
      const userToFind = ${config.database === 'mongodb' ? 
        'await User.findOne({ email: value });' :
        'await prisma.user.findUnique({ where: { email } });'
      }
      if (!userToFind) throw new Error("User Not Found!");
    }).trim().isEmail(),
  body("password").notEmpty().withMessage("Password can't be empty!"),
];
`;
`;

const generateRegistrationSessionUtils = () => `import crypto from "crypto";
import redisClient from "../lib/redis.lib.js";

export const createRegistrationSession = async (userData) => {
  const token = crypto.randomBytes(32).toString("hex");
  const sessionData = { userData, createdAt: Date.now() };
  await redisClient.setex(\`registration:\${token}\`, 1800, JSON.stringify(sessionData));
  return token;
};

export const getRegistrationSession = async (token) => {
  const data = await redisClient.get(\`registration:\${token}\`);
  if (!data) {
    const error = new Error("Registration session expired or invalid");
    error.status = 400;
    throw error;
  }
  return JSON.parse(data);
};

export const deleteRegistrationSession = async (token) => {
  await redisClient.del(\`registration:\${token}\`);
};
`;

const generateRegistrationCleanupUtils = () => `import redisClient from "../lib/redis.lib.js";
import { logger } from "devdad-express-utils";

export const setupAutomaticCleanup = (intervalMinutes = 30) => {
  const cleanup = async () => {
    try {
      const keys = await redisClient.keys("registration:*");
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        if (ttl === -1) await redisClient.del(key);
      }
      logger.info(\`Cleaned up \${keys.length} registration sessions\`);
    } catch (error) {
      logger.error("Registration cleanup error:", error);
    }
  };
  
  return setInterval(cleanup, intervalMinutes * 60 * 1000);
};
`;

const generateClearRedisCacheUtils = () => `import { logger } from "devdad-express-utils";

export const clearRedisUserCache = async (req, userId) => {
  try {
    const redisClient = req.redisClient;
    if (redisClient) {
      await redisClient.del(\`user:\${userId}\`);
    }
  } catch (error) {
    logger.error("Failed to clear user cache:", error);
  }
};
`;

const generateRedisLib = () => `import Redis from "ioredis";
import { logger } from "devdad-express-utils";

const redisClient = new Redis(process.env.REDIS_URL, {
  family: 4,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
});

redisClient.on("connect", () => logger.info("✅ Redis connected"));
redisClient.on("ready", () => logger.info("🟢 Redis ready"));
redisClient.on("error", (err) => logger.error("❌ Redis error:", err.message));
redisClient.on("close", () => logger.warn("⚠️ Redis connection closed"));
redisClient.on("reconnecting", (time) => logger.warn(\`🔄 Redis reconnecting in \${time}ms\`));

export default redisClient;
`;

const generateSendMailLib = () => `import { MailtrapClient } from "mailtrap";
import { Resend } from "resend";
import { logger } from "devdad-express-utils";

const mailtrapClient = process.env.MAILTRAP_API_KEY 
  ? new MailtrapClient({ token: process.env.MAILTRAP_API_KEY })
  : null;

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export const sendMail = async (to, subject, html) => {
  // Try Resend first (production)
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || "noreply@yourdomain.com",
        to, subject, html
      });
      logger.info("Email sent via Resend", { to, subject });
      return;
    } catch (error) {
      logger.error("Resend failed, trying Mailtrap", { error: error.message });
    }
  }

  // Fallback to Mailtrap (development)
  if (mailtrapClient) {
    try {
      await mailtrapClient.send({
        from: { email: "noreply@demomailtrap.co", name: "DevStack" },
        to: [{ email: to }],
        subject, html
      });
      logger.info("Email sent via Mailtrap", { to, subject });
      return;
    } catch (error) {
      logger.error("Mailtrap failed", { error: error.message });
    }
  }

  // Development fallback - log to console
  logger.info(\`[DEV EMAIL] To: \${to}, Subject: \${subject}\`);
  logger.debug("Email HTML content logged (no email service configured)");
};
`;

const generateAuthMiddlewareAdvanced = () => `import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { sendError, logger } from "devdad-express-utils";

export const authenticateUserMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return sendError(res, "Access token required", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return sendError(res, "User not found", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired", 401);
    }
    return sendError(res, "Invalid token", 401);
  }
};

export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select("-password");
    }
  } catch (error) {
    // Silent fail for optional auth
  }
  next();
};

export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.isVerified) {
    return sendError(res, "Email verification required", 403);
  }
  next();
};
`;

// Client Generation Functions
const generateClientPackageJson = (config) => {
  return JSON.stringify({
    name: `${config.sanitizedName || 'devstack'}-client`,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.26.0',
      'react-hot-toast': '^2.6.0',
      'lucide-react': '^0.475.0'
    },
    devDependencies: {
      'vite': '^5.0.8',
      '@vitejs/plugin-react': '^4.2.1',
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.32',
      'autoprefixer': '^10.4.16'
    }
  }, null, 2);
};

const generateViteConfig = () => `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});`;

const generateIndexHtml = () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevStack App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

const generateTailwindConfig = () => `export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: []
}`;

const generatePostcssConfig = () => `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const generateClientCss = () => `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  min-height: 100vh;
}
`;

const generateAppComponent = (config) => `import { Toaster } from "react-hot-toast";
import { Outlet } from "react-router-dom";

export const App = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
        }}
      />
      <Outlet />
    </div>
  );
};

export default App;
`;

const generateMainFile = (config) => `import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Login from './components/Login';
import Register from './components/Register';
import VerifyEmail from './components/VerifyEmail';
import Dashboard from './components/Dashboard';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Login /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'verify-email', element: <VerifyEmail /> },
      { path: 'dashboard', element: <Dashboard /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
`;

const generateLoginComponent = (config) => `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { updateData } from "../utils/api";
import { usePasswordVisibility, EyeIcon } from "../utils/passwordVisibility.jsx";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const passwordVisibility = usePasswordVisibility(false);

  localStorage.clear();
  sessionStorage.clear();

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await toast.promise(
        updateData("api/auth/login", formData),
        {
          loading: "Signing in...",
          success: "Login successful!",
          error: (err) => err.message || "Login failed",
        }
      );

      if (response) {
        toast.success("Welcome back!");
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="email" name="email" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" placeholder="you@example.com" value={formData.email} onChange={handleInput} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type={passwordVisibility.type} name="password" className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" placeholder="Enter your password" value={formData.password} onChange={handleInput} required />
                <EyeIcon isVisible={passwordVisibility.isVisible} onClick={passwordVisibility.toggle} className="right-3" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <button onClick={() => navigate("/register")} className="text-indigo-600 hover:text-indigo-700 font-medium">Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
`;

const generateDashboardComponent = () => `import { useNavigate } from "react-router-dom";
import { LogOut, User, Shield, Zap, Database, Mail, Key, Server, CheckCircle } from "lucide-react";
import { logout } from "../utils/api";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const features = [
    { icon: Shield, label: "JWT Authentication", color: "bg-green-500", desc: "Secure token-based auth" },
    { icon: Key, label: "Refresh Tokens", color: "bg-blue-500", desc: "Auto token rotation" },
    { icon: Mail, label: "Email Verified", color: "bg-purple-500", desc: "OTP verification complete" },
    { icon: Database, label: "Redis Sessions", color: "bg-red-500", desc: "Fast session management" },
    { icon: Server, label: "Rate Limited", color: "bg-orange-500", desc: "DDoS protection" },
    { icon: Zap, label: "Cookie Auth", color: "bg-yellow-500", desc: "HttpOnly secure cookies" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DevStack</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Card */}
        <div className="glass-panel rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to DevStack!</h1>
              <p className="text-gray-400">Your authentication is complete. Here's what's protecting your account:</p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400">Authentication Successful</h3>
              <p className="text-green-300/70">All security features are active and protecting your session.</p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <h2 className="text-xl font-semibold text-white mb-6">Active Security Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <div key={idx} className="glass-panel rounded-xl p-6 hover:border-indigo-500/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={\`w-12 h-12 \${feature.color}/20 rounded-xl flex items-center justify-center\`}>
                  <feature.icon className={\`w-6 h-6 \${feature.color.replace('bg-', 'text-').replace('-500', '-400')}\`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.label}</h3>
                  <p className="text-sm text-gray-400 mt-1">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DevDad Utils Promo */}
        <div className="mt-12 glass-panel rounded-2xl p-8 border-indigo-500/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Powered by devdad-express-utils</h3>
              <p className="text-gray-400">Production-ready utilities for Express.js</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {["sendSuccess()", "sendError()", "catchAsync()", "connectDB()"].map((util, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg px-4 py-3 font-mono text-sm text-indigo-300">
                {util}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <a href="https://www.npmjs.com/package/devdad-express-utils" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              npm install devdad-express-utils →
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}`;

const generateRegisterComponent = (config) => `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { updateData } from "../utils/api";
import { PasswordStrengthIndicator } from "../utils/passwordValidation.jsx";
import { usePasswordVisibility, EyeIcon } from "../utils/passwordVisibility.jsx";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const passwordVisibility = usePasswordVisibility(false);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await toast.promise(
        updateData("api/auth/register", formData),
        {
          loading: "Creating account...",
          success: "Registration initiated! Check your email.",
          error: (err) => err.message || "Registration failed",
        }
      );

      if (response) {
        if (response.registrationToken) {
          sessionStorage.setItem("registrationToken", response.registrationToken);
        }
        navigate("/verify-email");
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join us today</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" name="firstName" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-sm" placeholder="First name" value={formData.firstName} onChange={handleInput} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" name="lastName" className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-sm" placeholder="Last name" value={formData.lastName} onChange={handleInput} required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="email" name="email" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" placeholder="you@example.com" value={formData.email} onChange={handleInput} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type={passwordVisibility.type} name="password" className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" placeholder="Create a strong password" value={formData.password} onChange={handleInput} required />
                <EyeIcon isVisible={passwordVisibility.isVisible} onClick={passwordVisibility.toggle} className="right-3" />
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="text-center">
            <span className="text-gray-600">Already have an account? </span>
            <button onClick={() => navigate("/login")} className="text-indigo-600 hover:text-indigo-700 font-medium">Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
`;

const generateVerifyEmailComponent = () => `import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { updateData } from "../utils/api";

function VerifyEmail() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const registrationToken = sessionStorage.getItem("registrationToken");
  if (!registrationToken) {
    navigate("/register");
    return null;
  }

  const handleOtpChange = (e) => {
    const value = e.target.value;
    if (/^\\d{0,4}$/.test(value)) setOtp(value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      toast.error("Please enter a 4-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await toast.promise(
        updateData("api/auth/verify-registration", { registrationToken, otp }),
        {
          loading: "Verifying email...",
          success: "Email verified successfully!",
          error: (err) => err.message || "Verification failed",
        }
      );

      if (response) {
        setIsVerified(true);
        sessionStorage.removeItem("registrationToken");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white shadow-xl rounded-2xl p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">Your account has been created. Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/register")} className="flex items-center text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Register
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">We've sent a 4-digit code to your email</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Enter Verification Code</label>
              <div className="flex justify-center">
                <input type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className="w-28 text-center text-3xl font-bold tracking-widest px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none" placeholder="0000" value={otp} onChange={handleOtpChange} required autoFocus />
              </div>
            </div>
            <button type="submit" disabled={isLoading || otp.length !== 4} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Verifying..." : "Verify Email"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <Shield className="w-4 h-4 mr-2 text-green-500" />
            <span>Your code is valid for 5 minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
`;

const generateClientUtils = () => `import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function apiRequest(path, options = {}) {
  const url = \`\${API_BASE_URL}/\${path}\`;
  const config = {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
    return data;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

export async function updateData(path, content, showToast = true) {
  try {
    const data = await apiRequest(path, { method: "POST", body: JSON.stringify(content) });
    if (data.success) {
      return data.data;
    } else {
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err) => toast.error(err.msg || err.message));
      } else {
        toast.error(data.message || "Something went wrong");
      }
      return null;
    }
  } catch (error) {
    toast.error(error.message || "Network error. Please try again.");
    return null;
  }
}

export async function fetchData(path, showToast = false) {
  try {
    const data = await apiRequest(path, { method: "GET" });
    if (data.success) {
      return data.data;
    } else {
      toast.error(data.message || "Something went wrong");
      return null;
    }
  } catch (error) {
    if (showToast) toast.error(error.message || "Network error.");
    return null;
  }
}

export async function logout() {
  try {
    await fetch(\`\${API_BASE_URL}/api/auth/logout\`, { method: "POST", credentials: "include" });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }
}

export { apiRequest };
`;

const generatePasswordVisibility = () => `import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const usePasswordVisibility = (initialVisible = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  return {
    isVisible,
    type: isVisible ? "text" : "password",
    toggle: () => setIsVisible(!isVisible),
};
`;

const generatePasswordValidation = () => `export const PasswordStrengthIndicator = ({ password }) => {
  const checks = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(password) },
    { label: "Number", valid: /[0-9]/.test(password) },
    { label: "Symbol", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  
  const strength = checks.filter(c => c.valid).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={\`h-1 flex-1 rounded \${i < strength ? colors[strength - 1] : "bg-gray-200"}\`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span key={check.label} className={\`text-xs \${check.valid ? "text-green-600" : "text-gray-400"}\`}>
            {check.valid ? "✓" : "○"} {check.label}
          </span>
        ))}
      </div>
    </div>
);
};
`;