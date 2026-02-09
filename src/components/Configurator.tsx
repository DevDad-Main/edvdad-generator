import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TemplateConfig, BackendStack, AuthType, DatabaseType, FrontendFramework } from '@/types/templates';
import { ArrowRight, ArrowLeft, Check, Download, Code2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface ConfiguratorProps {
  onBack: () => void;
  initialStack?: BackendStack;
}

const steps = [
  { id: 1, title: 'Stack Selection', description: 'Choose your backend framework' },
  { id: 2, title: 'Authentication', description: 'Configure auth strategy' },
  { id: 3, title: 'Database', description: 'Setup data persistence' },
  { id: 4, title: 'Features', description: 'Select additional features' },
  { id: 5, title: 'Review', description: 'Generate your template' }
];

export function Configurator({ onBack, initialStack }: ConfiguratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  
  const [config, setConfig] = useState<TemplateConfig>({
    stack: initialStack || 'express',
    auth: { type: 'none' },
    database: { type: 'none' },
    frontend: { framework: 'none' },
    features: {
      docker: false,
      testing: false,
      cicd: false,
      swagger: true,
      cors: true
    },
    projectName: 'my-backend'
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    // Validate project name on first step
    if (currentStep === 1) {
      if (!config.projectName.trim()) {
        toast.error('Project name is required');
        return;
      }
      if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.projectName.trim())) {
        toast.error('Project name must start with a letter and contain only letters, numbers, hyphens, and underscores');
        return;
      }
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Import the template generator
      const { generateTemplate } = await import('@/lib/template-generator.js');
      
      // Convert config to expected format
      const templateConfig = {
        backend: config.stack,
        frontend: config.frontend.framework,
        database: config.database.type,
        auth: config.auth.type,
        features: config.features,
        projectName: config.projectName,
        packageManager: 'npm',
        orm: config.database.type === 'mongodb' ? 'mongoose' : 'prisma',
        styling: 'tailwindcss'
      };
      
      console.log('Generating template with config:', templateConfig);
      
      // Generate template using the working generator
      await generateTemplate(templateConfig);
      
      setGenerated(true);
      
    } catch (error) {
      console.error('Generation failed:', error);
      // Show error toast or alert
    } finally {
      setGenerating(false);
    }
  };

  

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Configure Your Backend</h1>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">Step {currentStep} of {steps.length}</span>
              <span>•</span>
              <span>{steps[currentStep - 1].title}</span>
            </div>
          </div>
        </div>

        {/* Configuration Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-panel mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
                <CardDescription>{steps[currentStep - 1].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep === 1 && <StackSelection config={config} setConfig={setConfig} />}
                {currentStep === 2 && <AuthConfiguration config={config} setConfig={setConfig} />}
                {currentStep === 3 && <DatabaseConfiguration config={config} setConfig={setConfig} />}
                {currentStep === 4 && <FeaturesConfiguration config={config} setConfig={setConfig} />}
                {currentStep === 5 && <ReviewConfiguration config={config} />}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!generated ? (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="glass-panel"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleGenerate} 
                disabled={generating}
                className="bg-primary hover:bg-primary/90 glow-accent"
              >
                {generating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Code2 className="w-4 h-4 mr-2" />
                    Generate Template
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <Card className="glass-panel border-primary/50 glow-accent">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Template Generated!</h3>
                  <p className="text-muted-foreground">
                    Your backend template is ready to download
                  </p>
                </div>
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Template Downloaded!</h3>
                    <p className="text-muted-foreground">
                      Your backend template has been downloaded automatically.
                    </p>
                  </div>
                  <Button variant="outline" onClick={onBack} className="glass-panel">
                    Create Another
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Step Components
function StackSelection({ config, setConfig }: { config: TemplateConfig; setConfig: (c: TemplateConfig) => void }) {
  const stacks: { value: BackendStack; label: string; desc: string; isComingSoon?: boolean }[] = [
    { value: 'express', label: 'Express.js', desc: 'Fast, unopinionated, minimalist web framework' },
    { value: 'fastapi', label: 'FastAPI', desc: 'Modern, fast Python framework with async support', isComingSoon: true },
    { value: 'django', label: 'Django', desc: 'High-level Python framework with batteries included', isComingSoon: true },
    { value: 'nestjs', label: 'NestJS', desc: 'Progressive Node.js framework with TypeScript', isComingSoon: true },
    { value: 'flask', label: 'Flask', desc: 'Lightweight and flexible Python framework', isComingSoon: true }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          value={config.projectName}
          onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
          placeholder="my-awesome-backend"
          className="glass-panel"
        />
      </div>

      <div className="space-y-3">
        <Label>Backend Framework</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stacks.map((stack) => (
            <motion.div
              key={stack.value}
              whileHover={{ scale: stack.isComingSoon ? 1 : 1.02 }}
              whileTap={{ scale: stack.isComingSoon ? 1 : 0.98 }}
            >
              <button
                onClick={() => !stack.isComingSoon && setConfig({ ...config, stack: stack.value })}
                disabled={stack.isComingSoon}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all relative ${
                  config.stack === stack.value && !stack.isComingSoon
                    ? 'border-primary bg-primary/10 glow-accent-sm'
                    : stack.isComingSoon
                    ? 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'border-border/50 glass-panel hover:border-primary/50'
                }`}
              >
                <div className="font-semibold mb-1">{stack.label}</div>
                <div className="text-sm text-muted-foreground">{stack.desc}</div>
                {stack.isComingSoon && (
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-gray-200 text-gray-600">
                    In Development
                  </Badge>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthConfiguration({ config, setConfig }: { config: TemplateConfig; setConfig: (c: TemplateConfig) => void }) {
  const authTypes: { value: AuthType; label: string; desc: string }[] = [
    { value: 'none', label: 'No Authentication', desc: 'Skip authentication setup' },
    { value: 'jwt', label: 'JWT', desc: 'JSON Web Token based authentication' },
    { value: 'otp', label: 'OTP', desc: 'One-time password verification' },
    { value: 'jwt-otp', label: 'JWT + OTP', desc: 'Combined JWT and OTP for advanced security' },
    { value: 'oauth', label: 'OAuth 2.0', desc: 'Third-party authentication (Google, GitHub, etc.)' }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Authentication Type</Label>
        <Select
          value={config.auth.type}
          onValueChange={(value) => setConfig({ ...config, auth: { ...config.auth, type: value as AuthType } })}
        >
          <SelectTrigger className="glass-panel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {authTypes.map((auth) => (
              <SelectItem key={auth.value} value={auth.value}>
                <div>
                  <div className="font-medium">{auth.label}</div>
                  <div className="text-xs text-muted-foreground">{auth.desc}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.auth.type === 'oauth' && (
        <div className="space-y-3">
          <Label>OAuth Providers</Label>
          <div className="space-y-2">
            {['Google', 'GitHub', 'Facebook', 'Twitter'].map((provider) => (
              <div key={provider} className="flex items-center space-x-2">
                <Checkbox id={provider.toLowerCase()} />
                <label
                  htmlFor={provider.toLowerCase()}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {provider}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseConfiguration({ config, setConfig }: { config: TemplateConfig; setConfig: (c: TemplateConfig) => void }) {
  const databases: { value: DatabaseType; label: string }[] = [
    { value: 'none', label: 'No Database' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Database Type</Label>
        <Select
          value={config.database.type}
          onValueChange={(value) => setConfig({ ...config, database: { ...config.database, type: value as DatabaseType } })}
        >
          <SelectTrigger className="glass-panel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db.value} value={db.value}>
                {db.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.database.type !== 'none' && (
        <div className="space-y-3">
          <Label>Frontend Framework (Optional)</Label>
          <Select
            value={config.frontend.framework}
            onValueChange={(value) => setConfig({ ...config, frontend: { framework: value as FrontendFramework } })}
          >
            <SelectTrigger className="glass-panel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Frontend</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue.js</SelectItem>
              <SelectItem value="angular">Angular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function FeaturesConfiguration({ config, setConfig }: { config: TemplateConfig; setConfig: (c: TemplateConfig) => void }) {
  const features = [
    { key: 'docker', label: 'Docker Configuration', desc: 'Dockerfile and docker-compose.yml' },
    { key: 'testing', label: 'Testing Setup', desc: 'Jest/Pytest with example tests' },
    { key: 'cicd', label: 'CI/CD Pipeline', desc: 'GitHub Actions workflow' },
    { key: 'swagger', label: 'API Documentation', desc: 'Auto-generated Swagger/OpenAPI docs' },
    { key: 'cors', label: 'CORS Configuration', desc: 'Cross-Origin Resource Sharing setup' }
  ] as const;

  return (
    <div className="space-y-4">
      {features.map((feature) => (
        <div
          key={feature.key}
          className="flex items-start space-x-3 p-4 rounded-lg glass-panel hover:border-primary/50 transition-all"
        >
          <Checkbox
            id={feature.key}
            checked={config.features[feature.key]}
            onCheckedChange={(checked) =>
              setConfig({
                ...config,
                features: { ...config.features, [feature.key]: checked }
              })
            }
          />
          <div className="flex-1">
            <label
              htmlFor={feature.key}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {feature.label}
            </label>
            <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewConfiguration({ config }: { config: TemplateConfig }) {
  const sections = [
    { title: 'Project', items: [
      { label: 'Name', value: config.projectName },
      { label: 'Stack', value: config.stack.toUpperCase() }
    ]},
    { title: 'Authentication', items: [
      { label: 'Type', value: config.auth.type === 'none' ? 'None' : config.auth.type.toUpperCase() }
    ]},
    { title: 'Database', items: [
      { label: 'Type', value: config.database.type === 'none' ? 'None' : config.database.type },
      { label: 'Frontend', value: config.frontend.framework === 'none' ? 'None' : config.frontend.framework }
    ]}
  ];

  const enabledFeatures = Object.entries(config.features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-lg font-semibold text-primary">{section.title}</h3>
          <div className="glass-panel p-4 rounded-lg space-y-2">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {enabledFeatures.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary">Additional Features</h3>
          <div className="flex flex-wrap gap-2">
            {enabledFeatures.map((feature) => (
              <Badge key={feature} variant="secondary" className="font-mono">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
