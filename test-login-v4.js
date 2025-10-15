// Test direct callback endpoint
async function testLogin() {
  try {
    console.log('Testing direct callback endpoint...');

    // Get CSRF token
    const csrfRes = await fetch('http://localhost:3030/api/auth/csrf');
    const csrfData = await csrfRes.json();
    console.log('CSRF Token:', csrfData.csrfToken.substring(0, 20) + '...');

    // Call callback endpoint directly
    const loginRes = await fetch('http://localhost:3030/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@promptforge.com',
        password: 'Admin123!',
        csrfToken: csrfData.csrfToken,
        json: true
      }),
      redirect: 'manual'
    });

    console.log('\nLogin Response:');
    console.log('Status:', loginRes.status);
    console.log('Headers:', Object.fromEntries(loginRes.headers.entries()));

    if (loginRes.status === 200) {
      try {
        const data = await loginRes.json();
        console.log('\nResponse Data:', data);

        if (data.url) {
          if (data.url.includes('/dashboard')) {
            console.log('✅ Login successful! Redirect to:', data.url);
          } else if (data.url.includes('/sign-in')) {
            console.log('❌ Login failed - redirected to sign-in');
          } else {
            console.log('⚠️  Unexpected redirect:', data.url);
          }
        } else if (data.error) {
          console.log('❌ Login error:', data.error);
        }
      } catch (e) {
        const text = await loginRes.text();
        console.log('Response text:', text.substring(0, 200));
      }
    } else if (loginRes.status === 302 || loginRes.status === 307) {
      const location = loginRes.headers.get('location');
      console.log('\nRedirect to:', location);

      if (location && location.includes('/dashboard')) {
        console.log('✅ Login successful!');
      } else if (location && location.includes('/sign-in')) {
        console.log('❌ Login failed');
      }
    } else {
      console.log('Unexpected status code');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
