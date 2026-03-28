"use client";
import { useEffect } from 'react';

export const useScript = (scriptContent: string) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.innerHTML = scriptContent;
    script.async = true;
    
    try {
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error executing script:', error);
    }

    return () => {
      try {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      } catch (error) {
        console.error('Error removing script:', error);
      }
    };
  }, [scriptContent]);
};


