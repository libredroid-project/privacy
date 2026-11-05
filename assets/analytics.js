// Vercel Web Analytics - Standalone initialization
// Based on @vercel/analytics v1.6.1

(function() {
  'use strict';
  
  // Initialize queue for tracking events before script loads
  function initQueue() {
    if (window.va) return;
    window.va = function(...params) {
      (window.vaq = window.vaq || []).push(params);
    };
  }
  
  // Detect environment
  function detectEnvironment() {
    try {
      const env = typeof process !== 'undefined' && process.env && process.env.NODE_ENV;
      if (env === 'development' || env === 'test') {
        return 'development';
      }
    } catch (e) {
      // Process is not defined in browser
    }
    return 'production';
  }
  
  // Set mode
  function setMode(mode = 'auto') {
    if (mode === 'auto') {
      window.vam = detectEnvironment();
      return;
    }
    window.vam = mode;
  }
  
  // Get current mode
  function getMode() {
    return window.vam || 'production';
  }
  
  // Check if in development
  function isDevelopment() {
    return getMode() === 'development';
  }
  
  // Get script source URL
  function getScriptSrc() {
    if (isDevelopment()) {
      return 'https://va.vercel-scripts.com/v1/script.debug.js';
    }
    return '/_vercel/insights/script.js';
  }
  
  // Inject analytics script
  function inject(props = {}) {
    setMode(props.mode || 'auto');
    initQueue();
    
    const src = getScriptSrc();
    
    // Don't inject if already present
    if (document.head.querySelector(`script[src*="${src}"]`)) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.sdkn = '@vercel/analytics';
    script.dataset.sdkv = '1.6.1';
    
    script.onerror = () => {
      const errorMessage = isDevelopment() 
        ? 'Please check if any ad blockers are enabled and try again.'
        : 'Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.';
      console.log(
        `[Vercel Web Analytics] Failed to load script from ${src}. ${errorMessage}`
      );
    };
    
    if (isDevelopment() && props.debug === false) {
      script.dataset.debug = 'false';
    }
    
    document.head.appendChild(script);
  }
  
  // Initialize analytics
  inject({ mode: 'auto' });
})();
