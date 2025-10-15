const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  const page = await browser.newPage();
  
  // 네트워크 요청 모니터링
  page.on('request', request => {
    if (request.url().includes('realtime') || request.url().includes('api/')) {
      console.log(`🔵 [Request] ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('realtime') || response.url().includes('api/')) {
      console.log(`🟢 [Response] ${response.status()} ${response.url()}`);
      if (response.status() !== 200) {
        console.log(`❌ [Error Response] Status: ${response.status()}`);
      }
    }
  });
  
  // 콘솔 로그 모니터링 (SSE 관련만)
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SSE') || text.includes('realtime') || text.includes('session') || text.includes('연결')) {
      console.log(`🟡 [Browser Console] ${msg.type()}: ${text}`);
    }
  });
  
  try {
    console.log('=== SSE 연결 디버깅 시작 ===\n');
    
    // 로그인
    console.log('1. admin@example.com으로 로그인...');
    await page.goto('http://localhost:3002/');
    
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // QA 환경 설정 건너뛰기
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('localhost:3002/') && !currentUrl.includes('users')) {
      console.log('2. QA 환경 설정 화면에서 테스트 시작하기 클릭...');
      try {
        await page.click('button:has-text("테스트 시작하기")');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('테스트 시작하기 버튼을 찾을 수 없음, 수동으로 진행...');
      }
    }
    
    // 관리자 모드 버튼 확인 및 클릭
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => btn.textContent?.trim()).filter(text => text)
    );
    console.log('Available buttons:', buttons);
    
    const adminModeButton = buttons.find(text => text.includes('관리자 모드'));
    if (adminModeButton) {
      console.log('3. 관리자 모드 활성화...');
      if (adminModeButton.includes('🔒')) {
        await page.click('button:has-text("🔒 관리자 모드")');
        await page.waitForTimeout(1000);
      }
    }
    
    // 사용자 관리 페이지로 이동
    try {
      await page.waitForSelector('button:has-text("👥 사용자 관리")', { timeout: 5000 });
      console.log('4. 사용자 관리 페이지로 이동...');
      await page.click('button:has-text("👥 사용자 관리")');
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('사용자 관리 버튼을 찾을 수 없음, URL로 직접 이동...');
      await page.goto('http://localhost:3002/users');
      await page.waitForTimeout(3000);
    }
    
    console.log('5. SSE 연결 상태 확인...');
    
    // SSE 연결 상태 확인
    const realtimeStatus = await page.evaluate(() => {
      // AuthContext에서 realtimeStatus 확인
      return window.localStorage.getItem('sse_debug') || 'unknown';
    });
    
    console.log('Current realtime status:', realtimeStatus);
    
    // 페이지에서 실시간 연결 상태 텍스트 확인
    try {
      const statusText = await page.textContent('.text-xs.text-slate-500', { timeout: 5000 });
      console.log('연결 상태 표시:', statusText);
    } catch (error) {
      console.log('연결 상태 표시를 찾을 수 없음');
    }
    
    // 현재 온라인 사용자 수 확인
    try {
      const onlineCountElements = await page.$$eval('text=온라인', elements => elements.length);
      console.log('온라인 텍스트 요소 개수:', onlineCountElements);
      
      if (onlineCountElements > 0) {
        const onlineCount = await page.evaluate(() => {
          const onlineCards = document.querySelectorAll('.text-xl.font-bold');
          for (let card of onlineCards) {
            const parent = card.closest('.bg-white');
            if (parent && parent.textContent.includes('온라인')) {
              return card.textContent.trim();
            }
          }
          return 'not found';
        });
        console.log('현재 온라인 사용자 수:', onlineCount);
      }
    } catch (error) {
      console.log('온라인 사용자 수를 확인할 수 없음:', error.message);
    }
    
    console.log('\n6. 5초 동안 실시간 이벤트 모니터링...');
    await page.waitForTimeout(5000);
    
    console.log('\n=== 디버깅 완료 ===');
    console.log('📋 확인사항:');
    console.log('  - SSE 연결 요청이 발생했는지');
    console.log('  - 연결 상태가 "실시간 연결됨"인지');
    console.log('  - PostgreSQL 알림이 수신되는지');
    
  } catch (error) {
    console.error('디버깅 오류:', error);
    await page.screenshot({ path: 'sse-debug-error.png' });
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();