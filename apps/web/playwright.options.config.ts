import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'atelier-options.spec.ts',workers:1,timeout:90000,use:{baseURL:'http://localhost:3001',reducedMotion:'reduce'},projects:[320,390,768,1024,1440].map(width=>({name:`options-${width}`,use:{viewport:{width,height:width===320?568:900}}}))});
