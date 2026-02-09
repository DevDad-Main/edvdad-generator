import { motion } from "framer-motion";
import { Terminal, Zap, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const scrollToTemplates = () => {
    const element = document.getElementById("templates");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />

      {/* Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Terminal Icon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel rounded-full glow-accent-sm">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">
              Production-Ready Templates
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span className="block text-foreground">Ship Your Backend</span>
            <span className="block bg-gradient-to-r from-primary via-indigo-400 to-primary bg-clip-text text-transparent">
              In Minutes.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Generate production-ready backend templates with authentication,
            routing, and database integration. Zero boilerplate. Full control.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold glow-accent rounded-lg group"
            >
              <Zap className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Generate Backend
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToTemplates}
              className="glass-panel border-border/50 hover:border-primary/50 px-8 py-6 text-lg"
            >
              View Templates
            </Button>
          </div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-12"
          >
            {[
              { icon: Shield, label: "Built-in Auth" },
              { icon: Database, label: "Database Ready" },
              { icon: Terminal, label: "CLI Friendly" },
              { icon: Zap, label: "Instant Setup" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 glass-panel rounded-lg"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {feature.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
