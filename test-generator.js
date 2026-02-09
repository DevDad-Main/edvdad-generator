import { generateTemplate } from '../src/lib/template-generator.js';

// Test configuration
const testConfig = {
  backend: 'express',
  frontend: 'react',
  database: 'mongodb',
  auth: 'jwt-otp',
  features: {
    docker: true,
    testing: false,
    cicd: false,
    swagger: true,
    cors: true
  },
  projectName: 'test-backend',
  packageManager: 'npm',
  orm: 'mongoose',
  styling: 'tailwindcss'
};

// Test the generator
console.log('Testing template generator...');
console.log('Config:', testConfig);

try {
  await generateTemplate(testConfig);
  console.log('✅ Template generator test passed!');
} catch (error) {
  console.error('❌ Template generator test failed:', error);
}