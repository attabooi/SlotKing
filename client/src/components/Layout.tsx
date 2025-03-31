import { HelpCircle, Globe, Crown } from 'lucide-react';
import { Link } from 'wouter';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import SlotKingLogo from './SlotKingLogo';

// Define language options
interface LanguageOption {
  name: string;
  code: string;
  flag: string;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Available languages
  const languages: LanguageOption[] = [
    { name: 'English', code: 'en', flag: '🇺🇸' },
    { name: '한국어', code: 'ko', flag: '🇰🇷' },
    { name: '日本語', code: 'ja', flag: '🇯🇵' },
    { name: '中文', code: 'zh', flag: '🇨🇳' },
    { name: 'Español', code: 'es', flag: '🇪🇸' },
    { name: 'Français', code: 'fr', flag: '🇫🇷' },
  ];
  
  // State for selected language
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation bar */}
      <nav className="dark-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link href="/">
                <div className="flex-shrink-0 flex items-center cursor-pointer interactive-element">
                  <SlotKingLogo size={24} />
                  <span className="ml-2 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 text-transparent bg-clip-text">
                    SlotKing
                  </span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
                    <Globe className="h-4 w-4 mr-1" />
                    <span className="mr-1">
                      {languages.find(lang => lang.code === selectedLanguage)?.flag}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  {languages.map(language => (
                    <DropdownMenuItem 
                      key={language.code}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        selectedLanguage === language.code && "bg-primary/10"
                      )}
                      onClick={() => setSelectedLanguage(language.code)}
                    >
                      <span className="text-base">{language.flag}</span>
                      <span>{language.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </a>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
      
      {/* Footer */}
      <footer className="bg-muted/20 border-t border-border/10 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
            <div className="text-xs text-muted-foreground">
              © 2025 SlotKing
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
