import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const codeExamples = {
  express: `// server.js
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './middleware/auth';

const app = express();

app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  // Validate credentials
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ data: 'Secret data' });
});

app.listen(3000);`,

  docker: `# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - JWT_SECRET=\${JWT_SECRET}
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: password`,
};

export function CodePreviewSection() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Clean, Production-Ready{" "}
                <span className="bg-gradient-to-r from-primary via-indigo-400 to-primary bg-clip-text text-transparent">
                  Code
                </span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Every template follows industry best practices with clean
                architecture, proper error handling, and comprehensive
                documentation.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Type-safe with TypeScript/Pydantic",
                "Structured error handling",
                "Environment-based configuration",
                "Comprehensive API documentation",
                "Unit and integration tests",
                "Docker deployment ready",
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Code Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="glass-panel overflow-hidden">
              <Tabs defaultValue="express" className="w-full">
                <div className="border-b border-border/50 px-4">
                  <TabsList className="bg-transparent">
                    <TabsTrigger
                      value="express"
                      className="data-[state=active]:bg-primary/10"
                    >
                      Express
                    </TabsTrigger>
                    <TabsTrigger
                      value="docker"
                      className="data-[state=active]:bg-primary/10"
                    >
                      Docker
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="express" className="mt-0">
                  <SyntaxHighlighter 
                    language="javascript" 
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {codeExamples.express}
                  </SyntaxHighlighter>
                </TabsContent>

                <TabsContent value="docker" className="mt-0">
                  <SyntaxHighlighter 
                    language="dockerfile" 
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {codeExamples.docker}
                  </SyntaxHighlighter>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
