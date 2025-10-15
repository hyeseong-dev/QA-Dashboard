// Script to run database schema update
// Run with: node scripts/run-schema-update.js

async function updateSchema() {
  try {
    // Get admin token first
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return;
    }

    const { token } = await loginResponse.json();
    console.log('✅ Logged in as admin');

    // Run schema update
    const updateResponse = await fetch('http://localhost:3000/api/admin/update-schema', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!updateResponse.ok) {
      console.error('Schema update failed:', await updateResponse.text());
      return;
    }

    const result = await updateResponse.json();
    console.log('✅ Schema update completed:', result);

    // Display results
    if (result.results) {
      console.log('\n📊 Update Results:');
      result.results.forEach((r, i) => {
        const icon = r.status === 'success' ? '✅' : '❌';
        console.log(`${i + 1}. ${icon} ${r.sql}`);
        if (r.message) {
          console.log(`   Error: ${r.message}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the update
console.log('🚀 Starting schema update...');
updateSchema();