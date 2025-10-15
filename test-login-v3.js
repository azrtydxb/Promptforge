// Test proper NextAuth signin flow with signIn method
const { signIn } = require('next-auth/react');

async function testLogin() {
  try {
    console.log('Testing NextAuth signIn flow...');

    // First, get CSRF token
    const csrfRes = await fetch('http://localhost:3030/api/auth/csrf');
    const csrfData = await csrfRes.json();
    console.log('CSRF Token:', csrfData.csrfToken.substring(0, 20) + '...');

    // Try signing in with proper format
    const loginRes = await fetch('http://localhost:3030/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: '',  // Not used but sometimes required
        email: 'admin@promptforge.com',
        password: 'Admin123!',
        csrfToken: csrfData.csrfToken,
        callbackUrl: 'http://localhost:3030/dashboard',
        json: 'true'
      }),
      redirect: 'manual'
    });

    console.log('\nLogin Response:');
    console.log('Status:', loginRes.status);
    console.log('Status Text:', loginRes.statusText);
    console.log('Headers:', Object.fromEntries(loginRes.headers.entries()));

    if (loginRes.status === 200) {
      const data = await loginRes.json();
      console.log('\nResponse Data:', data);

      if (data.url && !data.error) {
        console.log('✅ Login successful! Redirect to:', data.url);
      } else {
        console.log('❌ Login failed:', data.error || 'Unknown error');
      }
    } else if (loginRes.status === 302 || loginRes.status === 307) {
      const location = loginRes.headers.get('location');
      console.log('\nRedirect to:', location);

      if (location && location.includes('/dashboard')) {
        console.log('✅ Login successful!');
      } else if (location && location.includes('/sign-in')) {
        console.log('❌ Login failed - redirected back to sign-in');
      } else {
        console.log('⚠️  Unexpected redirect');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
