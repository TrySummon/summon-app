import React, { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import '../../styles/markdown.css';
import { cn } from '../../utils/tailwind';

interface MarkdownProps {
  content: string;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Check if dark mode is active
  useEffect(() => {
    // Function to check and update theme
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      console.log('Theme changed, isDarkMode:', isDark);
    };
    
    // Check initial theme
    checkTheme();
    
    // Listen for theme changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'theme') {
        checkTheme();
      }
    });
    
    // Set up observer to detect theme changes in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Apply theme-specific styles to code blocks
    let style = document.getElementById('highlight-theme-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'highlight-theme-style';
      document.head.appendChild(style);
    }
    
    // Define theme-specific styles
    const darkThemeCSS = `
      .hljs { background: transparent !important; color: #e6e6e6 !important; }
      .hljs-comment, .hljs-quote { color: #7f848e !important; }
      .hljs-keyword, .hljs-selector-tag { color: #ff7b72 !important; }
      .hljs-string, .hljs-attr { color: #a5d6ff !important; }
      .hljs-number, .hljs-literal { color: #79c0ff !important; }
      .hljs-title, .hljs-function { color: #d2a8ff !important; }
      .markdown-content pre { border-color: rgba(255, 255, 255, 0.1) !important; }
    `;
    
    const lightThemeCSS = `
      .hljs { background: transparent !important; color: #24292e !important; }
      .hljs-comment, .hljs-quote { color: #6a737d !important; }
      .hljs-keyword, .hljs-selector-tag { color: #d73a49 !important; }
      .hljs-string, .hljs-attr { color: #032f62 !important; }
      .hljs-number, .hljs-literal { color: #005cc5 !important; }
      .hljs-title, .hljs-function { color: #6f42c1 !important; }
      .markdown-content pre { border-color: rgba(0, 0, 0, 0.1) !important; }
    `;
    
    // Apply the appropriate theme
    style.textContent = isDarkMode ? darkThemeCSS : lightThemeCSS;
    
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str: string, lang: string) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (error) {
            console.error('Highlight.js error:', error);
          }
        }
        // Use generic highlighting for unknown languages
        return hljs.highlightAuto(str).value;
      }
    });

    containerRef.current.innerHTML = md.render(content);

    // Add syntax highlighting classes to code blocks
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
      
      // Get the language class
      const classes = block.className.split(' ');
      const languageClass = classes.find(cls => cls.startsWith('language-'));
      const language = languageClass ? languageClass.replace('language-', '') : '';
      
      // Add language name to the pre element
      if (block.parentElement) {
        if (language) {
          block.parentElement.setAttribute('data-language', language);
        }
                
        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
          const codeText = block.textContent || '';
          navigator.clipboard.writeText(codeText).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => {
              copyButton.textContent = 'Copy';
              copyButton.classList.remove('copied');
            }, 2000);
          }).catch(err => {
            console.error('Failed to copy code: ', err);
          });
        });
        block.parentElement.appendChild(copyButton);
      }
    });

    // Make links open in a new tab
    const links = containerRef.current.querySelectorAll('a');
    links.forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [content, isDarkMode]);

  return (
    <div 
      ref={containerRef} 
      className={cn('markdown-content', className)}
    />
  );
};

export { Markdown };
