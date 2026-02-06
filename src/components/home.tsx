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
    <div className="min-h-screen w-full bg-background">
      <Navbar onGetStarted={handleGetStarted} />
      <div className="pt-20">
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
