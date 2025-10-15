const { chromium } = require('playwright');

(async () => {
  console.log('=== 실시간 업데이트 수정 테스트 ===\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--disable-web-security'] // CORS 이슈 방지
  });
  
  // 두 개의 브라우저 컨텍스트 생성
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Page 1에서 SSE 이벤트 모니터링
  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('SSE') || text.includes('session') || text.includes('realtime')) {
      console.log(`🔵 [Page1 Console] ${text}`);
    }
  });
  
  // Page 2에서 SSE 이벤트 모니터링
  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('SSE') || text.includes('session') || text.includes('realtime')) {
      console.log(`🟢 [Page2 Console] ${text}`);
    }
  });
  
  try {
    // === Phase 1: 첫 번째 사용자 로그인 ===
    console.log('1️⃣ Page 1 - admin@example.com 로그인...');
    await page1.goto('http://localhost:3002/');
    
    await page1.waitForSelector('input[name="email"]');
    await page1.fill('input[name="email"]', 'admin@example.com');
    await page1.fill('input[name="password"]', 'password123');
    await page1.click('button[type="submit"]');
    
    // QA 환경 설정 건너뛰기
    await page1.waitForTimeout(2000);
    try {
      await page1.click('button:has-text("테스트 시작하기")');
      await page1.waitForTimeout(1000);
    } catch (error) {
      console.log('테스트 시작하기 버튼 건너뛰기');
    }
    
    // 사용자 관리 페이지로 직접 이동
    await page1.goto('http://localhost:3002/users');
    await page1.waitForTimeout(3000);
    
    // 현재 온라인 사용자 수 확인
    const getOnlineCount = async (page) => {
      return await page.evaluate(() => {
        const elements = document.querySelectorAll('.text-xl.font-bold');
        for (let element of elements) {
          const card = element.closest('.bg-white');
          if (card && card.textContent.includes('온라인')) {
            return element.textContent.trim();
          }
        }
        return '0';
      });
    };
    
    const initialCount = await getOnlineCount(page1);
    console.log(`📊 초기 온라인 사용자: ${initialCount}명`);
    
    // === Phase 2: 두 번째 사용자 로그인 ===
    console.log('\n2️⃣ Page 2 - user-t001@example.com 로그인...');
    await page2.goto('http://localhost:3002/');
    
    await page2.waitForSelector('input[name="email"]');
    await page2.fill('input[name="email"]', 'user-t001@example.com');
    await page2.fill('input[name="password"]', 'password123');
    await page2.click('button[type="submit"]');
    
    await page2.waitForTimeout(3000);
    console.log('✅ 두 번째 사용자 로그인 완료');
    
    // === Phase 3: 실시간 업데이트 확인 ===
    console.log('\n3️⃣ 실시간 업데이트 확인 중...');
    
    // 5초 동안 대기하며 변화 감지
    let changeDetected = false;
    for (let i = 0; i < 5; i++) {
      await page1.waitForTimeout(1000);
      const currentCount = await getOnlineCount(page1);
      console.log(`   ${i+1}초: 온라인 사용자 ${currentCount}명`);
      
      if (parseInt(currentCount) > parseInt(initialCount)) {
        console.log('🎉 실시간 업데이트 감지됨!');
        changeDetected = true;
        break;
      }
    }
    
    if (!changeDetected) {
      console.log('⚠️ 실시간 업데이트가 감지되지 않음');
      
      // 수동 새로고침으로 확인
      console.log('🔄 수동 새로고침으로 확인...');
      await page1.reload();
      await page1.waitForTimeout(2000);
      
      const refreshedCount = await getOnlineCount(page1);
      console.log(`📊 새로고침 후: ${refreshedCount}명`);
      
      if (parseInt(refreshedCount) > parseInt(initialCount)) {
        console.log('✅ 새로고침 후 정상 반영됨 - 실시간 기능에 문제 있음');
      }
    }
    
    // === Phase 4: 로그아웃 테스트 ===
    console.log('\n4️⃣ 로그아웃 테스트...');
    await page2.click('button:has-text("로그아웃")');
    await page2.waitForTimeout(2000);
    
    // 로그아웃 후 실시간 업데이트 확인
    console.log('로그아웃 후 실시간 업데이트 확인 중...');
    let logoutChangeDetected = false;
    
    for (let i = 0; i < 5; i++) {
      await page1.waitForTimeout(1000);
      const currentCount = await getOnlineCount(page1);
      console.log(`   ${i+1}초: 온라인 사용자 ${currentCount}명`);
      
      if (parseInt(currentCount) < parseInt(refreshedCount || initialCount)) {
        console.log('🎉 로그아웃 실시간 업데이트 감지됨!');
        logoutChangeDetected = true;
        break;
      }
    }
    
    if (!logoutChangeDetected) {
      console.log('⚠️ 로그아웃 실시간 업데이트가 감지되지 않음');
    }
    
    // === Phase 5: 서버 로그 확인 ===
    console.log('\n5️⃣ 브라우저 개발자 도구에서 Network 탭 확인:');
    console.log('   - /api/realtime 요청이 있는지');
    console.log('   - SSE 연결이 유지되는지');
    console.log('   - PostgreSQL 알림이 수신되는지');
    
  } catch (error) {
    console.error('테스트 오류:', error);
  } finally {
    console.log('\n=== 테스트 완료 ===');
    console.log('💡 결과 분석:');
    console.log('  - 실시간 업데이트가 작동하면 → SSE 수정 성공');
    console.log('  - 새로고침 후에만 반영되면 → PostgreSQL 트리거 확인 필요');
    console.log('  - 아예 변화가 없으면 → 세션 생성 로직 확인 필요');
    
    await page1.waitForTimeout(5000); // 관찰 시간
    await browser.close();
  }
})();