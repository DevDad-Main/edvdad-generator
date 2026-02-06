export type BackendStack = 'express' | 'fastapi' | 'django' | 'nestjs' | 'flask';
export type AuthType = 'jwt' | 'otp' | 'jwt-otp' | 'oauth' | 'none';
export type DatabaseType = 'postgresql' | 'mongodb' | 'mysql' | 'sqlite' | 'none';
export type FrontendFramework = 'react' | 'vue' | 'angular' | 'none';

export interface TemplateConfig {
  stack: BackendStack;
  auth: {
    type: AuthType;
    providers?: string[];
  };
  database: {
    type: DatabaseType;
    connectionString?: string;
  };
  frontend: {
    framework: FrontendFramework;
  };
  features: {
    docker: boolean;
    testing: boolean;
    cicd: boolean;
    swagger: boolean;
    cors: boolean;
  };
  projectName: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  stack: BackendStack;
  features: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
  icon: string;
}
