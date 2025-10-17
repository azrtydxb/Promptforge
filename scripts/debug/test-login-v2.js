// Test login with proper redirect handling
fetch('http://localhost:3030/api/auth/csrf')
  .then(res => res.json())
  .then(data => {
    const csrfToken = data.csrfToken;
    console.log('Got CSRF token');

    return fetch('http://localhost:3030/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'admin@promptforge.com',
        password: 'Admin123!',
        csrfToken: csrfToken,
        redirect: 'false'
      }),
      redirect: 'manual'
    });
  })
  .then(res => {
    console.log('\nLogin response status:', res.status);
    console.log('Response type:', res.type);
    console.log('Redirected:', res.redirected);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));

    if (res.status === 200) {
      return res.json().then(data => {
        console.log('\nResponse data:', data);
        if (data.url && !data.error) {
          console.log('✅ Login successful! Redirect URL:', data.url);
        } else if (data.error) {
          console.log('❌ Login failed:', data.error);
        }
      }).catch(err => {
        console.log('Could not parse JSON, checking as text...');
        return res.text().then(text => console.log('Response:', text.substring(0, 200)));
      });
    } else if (res.status === 302 || res.status === 307) {
      console.log('✅ Login successful! Redirecting to:', res.headers.get('location'));
    } else {
      console.log('❌ Unexpected status code');
      return res.text().then(text => console.log('Response:', text.substring(0, 200)));
    }
  })
  .catch(err => console.error('Error:', err.message));
