const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`Browser Console [${msg.type()}]:`, msg.text());
  });
  
  // Monitor network requests
  page.on('request', request => {
    console.log(`>> Request: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    console.log(`<< Response: ${response.status()} ${response.url()}`);
    if (response.status() === 404) {
      console.log('🔴 404 ERROR DETECTED!');
    }
  });
  
  // Monitor route changes
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`📍 Navigated to: ${frame.url()}`);
    }
  });
  
  try {
    console.log('\n=== STEP 1: Check current server ===');
    // First, let's check what's running
    const homeResponse = await page.goto('http://localhost:3001/', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    }).catch(async () => {
      console.log('Port 3001 failed, trying 3000...');
      return await page.goto('http://localhost:3000/', { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
    });
    
    const baseUrl = page.url().includes('3001') ? 'http://localhost:3001' : 'http://localhost:3000';
    console.log(`Using base URL: ${baseUrl}`);
    
    console.log('\n=== STEP 2: Direct navigation to /users ===');
    const usersResponse = await page.goto(`${baseUrl}/users`, { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    console.log(`Direct /users navigation status: ${usersResponse.status()}`);
    
    if (usersResponse.status() === 404) {
      console.log('\n🔴 /users route returns 404!');
      
      // Check what content is returned
      const pageContent = await page.content();
      console.log('Page title:', await page.title());
      
      // Check if it's Next.js 404 page
      const is404Page = pageContent.includes('404') || pageContent.includes('not found');
      console.log('Is 404 page content:', is404Page);
      
      // Take screenshot
      await page.screenshot({ path: '404-error.png' });
      console.log('Screenshot saved as 404-error.png');
    }
    
    console.log('\n=== STEP 3: Check file system structure ===');
    // Let's verify the file exists
    const fs = require('fs');
    const path = require('path');
    
    const userPagePath = path.join(__dirname, 'src', 'app', 'users', 'page.tsx');
    const fileExists = fs.existsSync(userPagePath);
    console.log(`File exists at ${userPagePath}: ${fileExists}`);
    
    if (!fileExists) {
      console.log('🔴 users/page.tsx file not found!');
      
      // Check what files are in app directory
      const appDir = path.join(__dirname, 'src', 'app');
      const files = fs.readdirSync(appDir);
      console.log('Files in src/app:', files);
      
      // Check if users directory exists
      const usersDir = path.join(appDir, 'users');
      if (fs.existsSync(usersDir)) {
        const usersFiles = fs.readdirSync(usersDir);
        console.log('Files in src/app/users:', usersFiles);
      } else {
        console.log('🔴 users directory does not exist!');
      }
    }
    
    console.log('\n=== STEP 4: Test authentication flow ===');
    // Navigate to home and check authentication
    await page.goto(baseUrl);
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to login
    const currentUrl = page.url();
    console.log('Current URL after navigating to home:', currentUrl);
    
    if (currentUrl.includes('login')) {
      console.log('Need to login first...');
      
      // Try to login
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      console.log('Logged in, current URL:', page.url());
      
      // Now try to navigate to users
      console.log('\n=== STEP 5: Navigate to /users after login ===');
      const loggedInResponse = await page.goto(`${baseUrl}/users`, { 
        waitUntil: 'networkidle' 
      });
      
      console.log(`/users navigation status after login: ${loggedInResponse.status()}`);
      
      if (loggedInResponse.status() === 404) {
        console.log('🔴 Still getting 404 after login!');
      } else {
        console.log('✅ Successfully navigated to users page!');
      }
    }
    
    console.log('\n=== STEP 6: Check Next.js build output ===');
    // Check if the route is built
    const buildManifest = path.join(__dirname, '.next', 'build-manifest.json');
    if (fs.existsSync(buildManifest)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
      console.log('Pages in build manifest:', Object.keys(manifest.pages || {}));
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for observation
    await browser.close();
  }
})();