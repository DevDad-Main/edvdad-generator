import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Template } from '@/types/templates';
import { ArrowRight } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const complexityColor = {
    basic: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    advanced: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const isComingSoon = template.stack !== 'express';

  return (
    <motion.div
      whileHover={{ y: isComingSoon ? 0 : -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`glass-panel hover:border-primary/50 transition-all duration-300 h-full flex flex-col ${
        isComingSoon ? 'opacity-60 border-gray-300/50' : ''
      }`}>
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className="text-4xl">{template.icon}</div>
            <div className="flex gap-2">
              <Badge 
                variant="outline" 
                className={complexityColor[template.complexity]}
              >
                {template.complexity}
              </Badge>
              {isComingSoon && (
                <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-xs">
                  In Development
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-xl font-bold">{template.name}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {template.features.slice(0, 3).map((feature, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs font-mono bg-muted/50"
                >
                  {feature}
                </Badge>
              ))}
              {template.features.length > 3 && (
                <Badge variant="secondary" className="text-xs font-mono bg-muted/50">
                  +{template.features.length - 3} more
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            onClick={() => !isComingSoon && onSelect(template)}
            disabled={isComingSoon}
            className={`w-full mt-6 group ${
              isComingSoon 
                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed' 
                : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
            }`}
            variant="outline"
          >
            {isComingSoon ? 'In Development' : 'Use Template'}
            {!isComingSoon && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
