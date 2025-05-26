import { execSync } from 'child_process';
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔨 Building Electron app for E2E tests...');
  
  try {
    // Build the Electron app before running tests
    execSync('npm run package', { 
      stdio: 'inherit',
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('✅ Electron app built successfully');
  } catch (error) {
    console.error('❌ Failed to build Electron app:', error);
    throw error;
  }
}

export default globalSetup; 