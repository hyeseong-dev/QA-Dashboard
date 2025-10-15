const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to login page...');
    // Try port 3001 first (as shown in earlier messages)
    await page.goto('http://localhost:3001/login').catch(() => 
      page.goto('http://localhost:3000/login')
    );
    
    // Wait for login form to load
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    
    console.log('2. Logging in as admin...');
    // Fill login form with admin credentials
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('http://localhost:3000/', { timeout: 5000 });
    console.log('3. Successfully logged in, now on project list page');
    
    // Wait for the user management button to appear
    console.log('4. Looking for user management button...');
    const userManagementButton = await page.waitForSelector('button:has-text("👥 사용자 관리")', { 
      timeout: 5000 
    });
    
    if (userManagementButton) {
      console.log('5. Found user management button, clicking...');
      
      // Get current URL before click
      const urlBefore = page.url();
      console.log('URL before click:', urlBefore);
      
      // Click the button
      await userManagementButton.click();
      
      // Wait a bit to see what happens
      await page.waitForTimeout(2000);
      
      // Check current URL
      const urlAfter = page.url();
      console.log('URL after click:', urlAfter);
      
      // Check for any error messages
      const errorMessages = await page.$$eval('.text-red-500, .bg-red-50', elements => 
        elements.map(el => el.textContent)
      );
      
      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
      }
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'user-navigation-debug.png' });
      console.log('Screenshot saved as user-navigation-debug.png');
      
      // Check console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
        }
      });
      
    } else {
      console.log('User management button not found!');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await page.waitForTimeout(3000); // Keep browser open for observation
    await browser.close();
  }
})();