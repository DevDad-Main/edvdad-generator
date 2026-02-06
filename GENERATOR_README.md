# Dynamic Backend Generator

A powerful CLI tool that dynamically generates complete backend applications based on user preferences. Supports multiple frameworks, databases, and authentication methods while maintaining a consistent structure.

## 🚀 Features

### Framework Support
- **Express.js** (recommended for Mongoose)
- **Fastify** (planned)
- **Koa.js** (planned)

### Database Options
- **MongoDB** with Mongoose ODM
- **PostgreSQL** with Prisma ORM
- **MySQL** with Prisma ORM  
- **SQLite** with Prisma ORM

### Authentication & Security
- JWT authentication with refresh tokens
- Email verification with OTP
- Password reset functionality
- Redis for session management
- Rate limiting
- Input validation and sanitization
- Security headers (Helmet)
- CORS configuration

### Additional Features
- Comprehensive logging system
- API documentation with Swagger
- File upload support
- Email service integration
- Frontend scaffolding

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend-generator

# Install dependencies
npm install

# Install globally for easy access
npm link
```

## 🎯 Usage

### Interactive Mode

```bash
# Run the interactive generator
node index.js

# If installed globally
backend-gen
```

### Configuration Options

The generator will ask you to configure:

1. **Project Name** - Name of your backend application
2. **Framework** - Choose between Express.js, Fastify, Koa.js
3. **Database** - MongoDB, PostgreSQL, MySQL, or SQLite
4. **Features** - Select from available authentication and security features
5. **Email Service** - Mailtrap, Resend, Nodemailer, or skip
6. **Frontend** - Generate matching frontend (React, Next.js, Vue.js)

## 📁 Generated Structure

```
your-project/
├── src/
│   ├── controllers/          # Route controllers
│   ├── routes/              # API routes  
│   ├── models/              # Database models (Mongoose) or
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point
├── prisma/                  # Prisma schema (if using Prisma)
├── client/                  # Frontend application (optional)
├── .env.example             # Environment variables template
├── package.json             # Project dependencies
└── README.md                # Generated documentation
```

## 🔧 Configuration Examples

### Express + MongoDB + Advanced Auth

Perfect for replicating the Advanced Auth structure:

```javascript
{
  projectName: 'my-auth-backend',
  framework: 'express',
  database: 'mongodb',
  features: [
    'jwt',           // JWT authentication
    'otp',           // Email verification with OTP
    'redis',         // Redis session management
    'rateLimit',     // Rate limiting
    'passwordReset', // Password reset functionality
    'logging',       // Comprehensive logging
    'validation',    // Input validation
    'cors',          // CORS configuration
    'helmet'         // Security headers
  ],
  emailService: 'mailtrap',
  includeFrontend: true,
  frontendFramework: 'react-vite'
}
```

### Express + PostgreSQL + Basic Auth

For simple applications with PostgreSQL:

```javascript
{
  projectName: 'simple-api',
  framework: 'express', 
  database: 'postgresql',
  features: [
    'jwt',
    'rateLimit', 
    'logging',
    'validation',
    'cors',
    'helmet'
  ],
  includeFrontend: false
}
```

## 📚 API Endpoints

### Authentication Endpoints

Generated authentication API includes:

- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-registration` - Email verification (OTP enabled)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation

### System Endpoints

- `GET /health` - Health check endpoint
- `GET /api-docs` - Swagger documentation (if enabled)

## 🔒 Security Features

- **Password Security**: Bcrypt hashing with 12 salt rounds
- **JWT Tokens**: Access tokens (15min) + Refresh tokens (7 days)
- **Cookie Security**: HttpOnly, Secure, SameSite cookies
- **Rate Limiting**: Redis-based rate limiting
- **Input Validation**: Express-validator integration
- **Security Headers**: Helmet middleware
- **CORS Protection**: Configurable origin restrictions

## 📧 Email Services

### Supported Providers

1. **Mailtrap** - Development and testing
   ```bash
   MAILTRAP_API_KEY=your-api-key
   ```

2. **Resend** - Production email service
   ```bash
   RESEND_API_KEY=your-resend-key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Nodemailer** - SMTP configuration
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

## 🗄️ Database Setup

### MongoDB

```bash
# Install MongoDB
mongod

# Environment variables
MONGO_URI=mongodb://localhost:27017/your-database
```

### PostgreSQL with Prisma

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
createdb your-database

# Environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/your-database?schema=public

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### MySQL with Prisma

```bash
# Install MySQL
sudo apt-get install mysql-server

# Environment variables
DATABASE_URL=mysql://username:password@localhost:3306/your-database

# Generate Prisma client
npm run db:generate
```

### SQLite with Prisma

```bash
# Environment variables
DATABASE_URL=file:./dev.db

# Generate Prisma client
npm run db:generate
```

## 🚀 Getting Started

### 1. Generate Your Backend

```bash
node index.js
# Follow the prompts to configure your project
```

### 2. Setup Environment

```bash
cd your-project
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

```bash
# For MongoDB: Make sure MongoDB is running
mongod

# For Prisma databases:
npm run db:generate
npm run db:push
```

### 5. Start Development

```bash
npm run dev
```

### 6. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","fullName":"Test User"}'
```

## 🛠 Development

### Project Structure

```
backend-generator/
├── src/
│   ├── generator.js          # Main generator logic
│   ├── validator.js          # Configuration validation
│   └── templates/            # Handlebars templates
│       ├── *.hbs            # Template files
│       ├── models/           # Database model templates
│       ├── controllers/      # Controller templates
│       ├── routes/           # Route templates
│       ├── middleware/       # Middleware templates
│       ├── services/         # Service templates
│       ├── utils/            # Utility templates
│       └── prisma/           # Prisma templates
├── index.js                  # CLI entry point
└── package.json              # Dependencies
```

### Adding New Templates

1. Create Handlebars template files in `src/templates/`
2. Use Handlebars helpers and variables
3. Update `generator.js` to process new templates
4. Test with various configurations

### Template Variables

Available variables in templates:

- `projectName` - Project name from user input
- `framework` - Selected framework (express, fastify, koa)
- `database` - Selected database (mongodb, postgresql, mysql, sqlite)
- `features` - Array of selected features
- `emailService` - Selected email service
- `includeFrontend` - Whether to generate frontend
- `frontendFramework` - Selected frontend framework

### Handlebars Helpers

- `{{eq a b}}` - Equality comparison
- `{{ne a b}}` - Not equal comparison
- `{{or a b}}` - Logical OR
- `{{and a b}}` - Logical AND
- `{{includes array item}}` - Array inclusion check
- `{{camelCase str}}` - Convert to camelCase
- `{{pascalCase str}}` - Convert to PascalCase

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your templates or improvements
4. Test with various configurations
5. Submit a pull request

## 📄 License

ISC License - Feel free to use and modify as needed.

## 🔗 Related Projects

- [Advanced Auth](https://github.com/DevDad-Main/Advanced-Auth) - Complete authentication system
- [DevDad Express Utils](https://www.npmjs.com/package/devdad-express-utils) - Express utility library

---

**Built with ❤️ for rapid backend development**