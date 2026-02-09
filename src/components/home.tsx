import { useState } from 'react';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { CodePreviewSection } from './CodePreviewSection';
import { TemplateGallery } from './TemplateGallery';
import { CTASection } from './CTASection';
import { Configurator } from './Configurator';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Template } from '@/types/templates';

type View = 'home' | 'configurator';

function Home() {
  const [view, setView] = useState<View>('home');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleGetStarted = () => {
    setView('configurator');
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setView('configurator');
  };

  const handleBack = () => {
    setView('home');
    setSelectedTemplate(null);
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* Global Background Grid Effect */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      {/* Global Glow Effects */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="fixed top-3/4 left-1/3 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
      
      <Navbar onGetStarted={handleGetStarted} />
      <div className="pt-20 relative z-10">
        {view === 'home' ? (
          <>
            <HeroSection onGetStarted={handleGetStarted} />
            <FeaturesSection />
            <CodePreviewSection />
            <TemplateGallery onSelectTemplate={handleSelectTemplate} />
            <CTASection onGetStarted={handleGetStarted} />
            <Footer />
          </>
        ) : (
          <Configurator 
            onBack={handleBack} 
            initialStack={selectedTemplate?.stack}
          />
        )}
      </div>
    </div>
  );
}

export default Home;
