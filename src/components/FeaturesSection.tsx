import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Shield, Database, Code2, GitBranch, Boxes } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast Setup',
    description: 'Go from idea to deployed backend in minutes, not days. Our templates are optimized for rapid development.'
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Built-in authentication patterns, secure defaults, and industry best practices baked into every template.'
  },
  {
    icon: Database,
    title: 'Database Ready',
    description: 'Pre-configured ORMs, migrations, and connection pooling for PostgreSQL, MongoDB, MySQL, and more.'
  },
  {
    icon: Code2,
    title: 'Clean Code',
    description: 'Well-structured, documented code following modern architecture patterns and design principles.'
  },
  {
    icon: GitBranch,
    title: 'CI/CD Included',
    description: 'GitHub Actions workflows ready to deploy to AWS, GCP, Azure, or any platform you choose.'
  },
  {
    icon: Boxes,
    title: 'Docker Native',
    description: 'Every template comes with Docker configuration for consistent development and deployment.'
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need,{' '}
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-primary bg-clip-text text-transparent">
              Out of the Box
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop reinventing the wheel. Focus on building features that matter for your business.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Card className="glass-panel hover:border-primary/50 transition-all duration-300 h-full">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 glow-accent-sm">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
