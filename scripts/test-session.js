// Script to test session management system
// Run with: node scripts/test-session.js

async function testSessionManagement() {
  const baseUrl = 'http://localhost:3002';
  
  console.log('🧪 Testing Session Management System\n');
  
  // Test 1: Login
  console.log('1️⃣ Testing Login...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'password123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    return;
  }
  
  const loginData = await loginResponse.json();
  console.log('✅ Login successful');
  console.log('   Token:', loginData.token.substring(0, 20) + '...');
  console.log('   User:', loginData.user.user_name);
  
  // Test 2: Check session in database
  console.log('\n2️⃣ Checking session in database...');
  console.log('   Run this SQL to verify:');
  console.log('   SELECT * FROM sessions WHERE user_id = \'' + loginData.user.user_id + '\' AND is_active = true;');
  
  // Test 3: Access protected endpoint
  console.log('\n3️⃣ Testing Protected Endpoint...');
  const usersResponse = await fetch(`${baseUrl}/api/users`, {
    headers: {
      'Authorization': `Bearer ${loginData.token}`
    }
  });
  
  if (!usersResponse.ok) {
    console.error('❌ Failed to access protected endpoint');
    console.error('   Status:', usersResponse.status);
    console.error('   Error:', await usersResponse.text());
  } else {
    const users = await usersResponse.json();
    console.log('✅ Successfully accessed protected endpoint');
    console.log('   Found', users.length, 'users');
    
    // Check online status
    const onlineUsers = users.filter(u => u.is_online);
    console.log('   Online users:', onlineUsers.length);
    
    // Should include the logged-in user
    const currentUser = users.find(u => u.user_id === loginData.user.user_id);
    if (currentUser && currentUser.is_online) {
      console.log('✅ Current user is marked as online');
    } else {
      console.log('⚠️ Current user is not marked as online (may need to wait for session sync)');
    }
  }
  
  // Test 4: Logout
  console.log('\n4️⃣ Testing Logout...');
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${loginData.token}`
    }
  });
  
  if (!logoutResponse.ok) {
    console.error('❌ Logout failed');
  } else {
    console.log('✅ Logout successful');
  }
  
  // Test 5: Try to access protected endpoint after logout
  console.log('\n5️⃣ Testing access after logout...');
  const afterLogoutResponse = await fetch(`${baseUrl}/api/users`, {
    headers: {
      'Authorization': `Bearer ${loginData.token}`
    }
  });
  
  if (afterLogoutResponse.ok) {
    console.error('❌ Still able to access protected endpoint after logout!');
  } else {
    console.log('✅ Correctly denied access after logout');
  }
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Additional Manual Tests:');
  console.log('   1. Wait 30 minutes to test auto-logout');
  console.log('   2. Check for warning message at 25 minutes');
  console.log('   3. Move mouse/type to reset timer');
  console.log('   4. Check online/offline status in Users page');
}

// Run the test
testSessionManagement().catch(console.error);