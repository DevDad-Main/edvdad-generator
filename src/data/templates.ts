import { Template } from '@/types/templates';

export const templates: Template[] = [
  {
    id: 'express-advanced-auth',
    name: 'Express Advanced Auth',
    description: 'Express.js server with JWT authentication, OTP verification, and complete user management',
    stack: 'express',
    features: ['JWT Auth', 'OTP Verification', 'Email Service', 'User Management', 'Password Reset'],
    complexity: 'advanced',
    icon: '🔐'
  },
  {
    id: 'express-rest-api',
    name: 'Express REST API',
    description: 'Basic Express.js REST API with routing, middleware, and error handling',
    stack: 'express',
    features: ['REST Endpoints', 'Middleware', 'Error Handling', 'CORS'],
    complexity: 'basic',
    icon: '🚀'
  },
  {
    id: 'fastapi-ml-ready',
    name: 'FastAPI ML Ready',
    description: 'FastAPI server optimized for machine learning with async support',
    stack: 'fastapi',
    features: ['Async Support', 'Pydantic Models', 'Auto Documentation', 'CORS'],
    complexity: 'intermediate',
    icon: '🤖'
  },
  {
    id: 'nestjs-microservice',
    name: 'NestJS Microservice',
    description: 'NestJS application with dependency injection and modular architecture',
    stack: 'nestjs',
    features: ['DI Container', 'Modules', 'Guards', 'Interceptors'],
    complexity: 'advanced',
    icon: '🏗️'
  },
  {
    id: 'django-full-stack',
    name: 'Django Full Stack',
    description: 'Django application with admin panel, ORM, and authentication',
    stack: 'django',
    features: ['Admin Panel', 'ORM', 'Auth System', 'Templates'],
    complexity: 'intermediate',
    icon: '🎯'
  },
  {
    id: 'flask-api',
    name: 'Flask Lightweight API',
    description: 'Minimal Flask API with blueprints and SQLAlchemy',
    stack: 'flask',
    features: ['Blueprints', 'SQLAlchemy', 'JWT', 'CORS'],
    complexity: 'basic',
    icon: '⚡'
  }
];
