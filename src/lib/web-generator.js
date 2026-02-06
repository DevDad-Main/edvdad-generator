import Handlebars from 'handlebars';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});
Handlebars.registerHelper('and', function() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});
Handlebars.registerHelper('includes', (array, item) => array && array.includes(item));

// Convert web config to generator format
export function convertConfig(config) {
  const features = [];
  
  if (config.auth.type !== 'none') {
    features.push('jwt');
    if (config.auth.type === 'otp' || config.auth.type === 'jwt-otp') {
      features.push('otp');
    }
    if (config.auth.type !== 'none') {
      features.push('passwordReset');
    }
  }
  
  if (config.features.cors) features.push('cors');
  if (config.features.helmet) features.push('helmet');
  if (config.features.swagger) features.push('docs');
  if (config.database.type !== 'none') features.push('validation');
  if (config.database.type !== 'none') features.push('logging');
  if (config.database.type !== 'none') features.push('rateLimit');
  
  if (config.database.type === 'mongodb' || config.database.type === 'postgresql' || 
      config.database.type === 'mysql' || config.database.type === 'sqlite') {
    features.push('redis');
  }

  return {
    projectName: config.projectName,
    framework: config.stack,
    database: config.database.type === 'none' ? 'none' : config.database.type,
    features,
    emailService: (config.auth.type !== 'none') ? 'mailtrap' : 'none',
    includeFrontend: config.frontend.framework !== 'none',
    frontendFramework: config.frontend.framework === 'none' ? 'none' : 
                     config.frontend.framework + '-vite'
  };
}

// Generate all files as a zip
export async function generateWebBackend(config) {
  const genConfig = convertConfig(config);
  const files = {};
  
  // Generate package.json
  files['package.json'] = JSON.stringify({
    "name": genConfig.projectName,
    "version": "1.0.0",
    "description": `Generated ${genConfig.framework} backend with ${genConfig.database}`,
    "main": "src/server.js",
    "type": "module",
    "scripts": {
      "start": "node src/server.js",
      "dev": "nodemon src/server.js"
    },
    "keywords": ["backend", "api", "auth", genConfig.framework, genConfig.database],
    "author": "",
    "license": "ISC",
    "dependencies": {
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
    },
    "devDependencies": {
      "nodemon": "^3.1.11"
    }
  }, null, 2);
  
  // Generate server.js
  files['src/server.js'] = `import { logger, connectDB, getDBStatus } from 'devdad-express-utils';
import app from './app.js';

const PORT = process.env.PORT || "3000";

async function startServer() {
  try {
    // Connect to MongoDB with automatic retry logic
    await connectDB();
    const dbStatus = getDBStatus();
    logger.info('Connected to MongoDB', { dbStatus });

    app.listen(PORT, () => {
      logger.info(\`🚀 Server running on port \${PORT}\`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();`;
  
  // Generate app.js
  files['src/app.js'] = `import "dotenv/config";
import express from "express";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;`;

  // Generate MongoDB models
  if (genConfig.database === 'mongodb' && genConfig.features.includes('jwt')) {
    files['src/models/User.model.js'] = `import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now(),
    },
    isVerified: {
      type: Boolean,
      default: false,
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

userSchema.methods.comparePassword = async function (passwordToCompare) {
  try {
    return await bcrypt.compare(passwordToCompare, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model("User", userSchema);`;
  }
  
  // Generate auth files
  if (genConfig.features.includes('jwt')) {
    files['src/controllers/auth.controller.js'] = `import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { logger, sendError, sendSuccess } from "devdad-express-utils";

const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "15m" }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
  );

  return { accessToken, refreshToken };
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, "Invalid credentials", 401);
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    sendSuccess(res, {
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });

  } catch (error) {
    logger.error("Login error:", error);
    sendError(res, "Login failed", 500);
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email,
      password: hashedPassword,
      fullName,
    });
    await user.save();

    sendSuccess(res, {
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });

  } catch (error) {
    logger.error("Registration error:", error);
    sendError(res, "Registration failed", 500);
  }
};`;
    
    files['src/routes/auth.routes.js'] = `import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

export { router as authRouter };`;
  }
  
  // Generate environment file
  files['.env.example'] = `# Server Configuration
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000

# Express Utils Configuration
SERVICE_NAME=${genConfig.projectName}
NODE_ENV=development

# MongoDB Configuration (with Express Utils connection management)
MONGO_URI=mongodb://localhost:27017/${genConfig.projectName}
DB_MAX_RETRIES=10
DB_RETRY_INTERVAL=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Configuration
MAILTRAP_API_KEY=your-mailtrap-api-key

# Redis Configuration
REDIS_URL=redis://localhost:6379`;
  
  // Generate README
  files['README.md'] = `# ${genConfig.projectName}

Generated ${genConfig.framework} backend with ${genConfig.database} and authentication features.

## 🚀 Features

- ✅ JWT Authentication with refresh tokens
- ✅ Redis for session management
- ✅ CORS configuration
- ✅ Security headers (Helmet)

## 🛠 Installation & Setup

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment configuration**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start server**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📡 API Endpoints

- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/logout\` - User logout
- \`POST /api/auth/refresh-token\` - Refresh access token
- \`GET /health\` - Health check endpoint

Built with DevDad Express Utils for robust error handling and logging!`;

  return files;
}