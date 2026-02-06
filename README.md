# 🚀 Dynamic Backend Generator

A powerful CLI tool that dynamically generates complete backend applications based on user preferences. Built to replicate your Advanced Auth structure with support for multiple databases and frameworks.

## ✨ Key Features

### 🎯 Perfect for Your Advanced Auth Setup
- **Express.js + MongoDB + Mongoose**: Full replication of your Advanced Auth stack
- **Express.js + Prisma**: PostgreSQL, MySQL, SQLite options
- **JWT Authentication**: With refresh token rotation
- **Email Verification**: OTP-based email verification
- **Redis Integration**: Session management and rate limiting
- **Password Reset**: Secure password reset flow

### 🛠 Powered by DevDad Express Utils
Every generated backend includes your **[Express Utils](https://github.com/DevDad-Main/Express-Utils)** package:
- ✅ **MongoDB Connection Management**: Automatic retries with exponential backoff
- ✅ **Standardized Responses**: `sendSuccess()` and `sendError()` utilities
- ✅ **Winston Logging**: Production-ready logging with service name
- ✅ **Error Handling**: Comprehensive error handler middleware
- ✅ **Self-Promotion**: Users discover your package!

### 🎨 Interactive CLI Experience
```bash
🚀 Dynamic Backend Generator
Generate a complete backend with your preferred stack

? Project name: my-auth-backend
? Choose framework: Express.js
? Choose database: MongoDB (with Mongoose)
? Select features: [✓] JWT Authentication
                    [✓] Email verification with OTP  
                    [✓] Redis for session management
                    [✓] Rate limiting
                    [✓] Password reset
                    [✓] CORS configuration
                    [✓] Security headers (Helmet)
? Choose email service: Mailtrap (Development)
? Generate matching frontend? Yes
? Choose frontend framework: React with Vite
```

## 📁 Generated Structure

```
my-auth-backend/
├── src/
│   ├── controllers/
│   │   └── auth.controller.js     # Complete auth logic
│   ├── routes/
│   │   └── auth.routes.js         # API endpoints
│   ├── models/                    # Mongoose models OR
│   │   ├── User.model.js          # Prisma schema in /prisma
│   │   └── RefreshToken.model.js
│   ├── middleware/
│   │   └── auth.middleware.js     # JWT middleware
│   ├── services/
│   │   └── email.service.js       # Email integration
│   ├── utils/
│   │   ├── validation.js          # Input validation
│   │   └── redis.js              # Redis client
│   ├── app.js                     # Express configuration
│   └── server.js                  # Entry point with DB connection
├── prisma/                       # Prisma files (if using Prisma)
├── client/                       # Frontend (optional)
├── .env.example                   # Environment template
├── package.json                   # Dependencies including your utils
└── README.md                     # Generated documentation
```

## 🎮 Quick Start

### 1. Install & Run Generator
```bash
git clone <this-repo>
cd backend-generator
npm install
npm link  # Global command: backend-gen
```

### 2. Generate Your Backend
```bash
backend-gen  # Interactive mode
# Or: node index.js
```

### 3. Setup Generated Project
```bash
cd my-auth-backend
npm install
cp .env.example .env
# Edit .env with your config
```

### 4. Start Development
```bash
# For MongoDB: Make sure MongoDB is running
mongod

npm run dev
```

## 🔧 Configuration Examples

### Your Advanced Auth Setup
```javascript
{
  projectName: 'my-advanced-auth',
  framework: 'express',
  database: 'mongodb',
  features: [
    'jwt',           // JWT auth with refresh tokens
    'otp',           // Email verification with OTP
    'redis',         // Redis for sessions & rate limiting
    'rateLimit',     // Advanced rate limiting
    'passwordReset', // Password reset flow
    'logging',       // Winston logging via Express Utils
    'validation',    // Input validation
    'cors',          // CORS configuration
    'helmet'         // Security headers
  ],
  emailService: 'mailtrap',
  includeFrontend: true,
  frontendFramework: 'react-vite'
}
```

### Modern PostgreSQL Setup
```javascript
{
  projectName: 'modern-api',
  framework: 'express',
  database: 'postgresql',
  features: ['jwt', 'redis', 'logging', 'validation', 'cors'],
  includeFrontend: false
}
```

## 📡 Generated API Endpoints

All projects include these authentication endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-registration` - Email verification (OTP)
- `POST /api/auth/login` - User login with HttpOnly cookies
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Automatic token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `GET /health` - Health check endpoint
- `GET /api-docs` - Swagger documentation (if enabled)

## 🔒 Security Features

- **JWT Tokens**: Access tokens (15min) + Refresh tokens (7 days)
- **HttpOnly Cookies**: Prevents XSS attacks on tokens
- **Password Security**: Bcrypt with 12 salt rounds
- **Rate Limiting**: Redis-based with configurable limits
- **Input Validation**: Express-validator integration
- **Security Headers**: Helmet middleware
- **CORS Protection**: Configurable origin restrictions

## 🛠 Development Features

### Express Utils Integration
```javascript
// MongoDB connection with automatic retries
import { connectDB, getDBStatus } from 'devdad-express-utils';
await connectDB();
const status = getDBStatus();

// Standardized responses
import { sendSuccess, sendError } from 'devdad-express-utils';
sendSuccess(res, userData, "Login successful", 200);
sendError(res, "Invalid credentials", 401);

// Production logging
import { logger } from 'devdad-express-utils';
logger.info('User logged in', { userId, ip });
logger.error('Database error', { error: err.message });

// Error handling middleware
import { errorHandler } from 'devdad-express-utils';
app.use(errorHandler);
```

### Database Options
- **MongoDB**: Full Mongoose integration with your Express Utils connection management
- **PostgreSQL/MySQL/SQLite**: Prisma ORM with generated schemas

### Email Services
- **Mailtrap**: Development testing
- **Resend**: Production emails  
- **Nodemailer**: Custom SMTP

## 📦 Package Dependencies

Every generated project includes:
```json
{
  "dependencies": {
    "express": "^5.2.1",
    "devdad-express-utils": "^1.8.2", // 🎯 Your package!
    "jsonwebtoken": "^9.0.3",
    "bcrypt": "^6.0.0",
    "helmet": "^8.1.0",
    "cors": "^2.8.6",
    "express-rate-limit": "^8.2.1",
    "express-validator": "^7.3.1",
    "cookie-parser": "^1.4.7"
    // + Database-specific packages
    // + Feature-specific packages
  }
}
```

## 🎯 Perfect Use Cases

### 1. Replicate Your Advanced Auth
Users can generate the exact same setup as your Advanced Auth project:
- Express.js + MongoDB + Mongoose
- JWT + OTP + Redis + Rate Limiting
- Email verification & password reset
- React frontend with matching structure

### 2. Modern Prisma Applications  
Users wanting modern ORM features:
- PostgreSQL with Prisma
- Type-safe database access
- Prisma Studio for database management
- Migration support

### 3. Rapid Prototyping
Developers need production-ready backends quickly:
- Complete authentication system
- Security best practices built-in
- Scalable architecture
- Comprehensive logging

## 🤝 Business Value

### For You (Self-Promotion)
- **Package Discovery**: Every generated backend includes your Express Utils
- **User Education**: Users learn your utilities through generated code
- **Ecosystem Growth**: More developers adopt your patterns
- **Brand Recognition**: "Built with DevDad Express Utils"

### For Users
- **Speed**: Generate complete backends in seconds
- **Best Practices**: Security, logging, error handling included
- **Flexibility**: Choose their preferred stack
- **Documentation**: Auto-generated READMEs
- **Production Ready**: Scalable, secure, maintainable

## 🚀 Deployment Ready

Generated backends are production-ready with:
- Environment-based configuration
- Security best practices
- Comprehensive error handling
- Structured logging
- Health check endpoints
- Database migration support (Prisma)

## 📚 Documentation

Each generated backend includes:
- **Complete README.md**: Setup instructions, API docs, configuration
- **Environment Template**: `.env.example` with all variables
- **Code Comments**: Explaining key components
- **API Documentation**: Swagger docs (if enabled)

---

## 🎉 Result

You now have a **dynamic backend generator** that:

1. ✅ **Replicates your Advanced Auth structure** exactly
2. ✅ **Promotes your Express Utils package** in every generated project  
3. ✅ **Supports multiple databases** (MongoDB + Mongoose, PostgreSQL + Prisma, etc.)
4. ✅ **Provides interactive CLI** for user-friendly configuration
5. ✅ **Generates production-ready code** with security best practices
6. ✅ **Includes comprehensive documentation** and setup instructions

Users can now generate backends that match your exact Advanced Auth setup, or choose modern alternatives like Prisma, all while discovering and using your Express Utils package! 🚀