const bcrypt = require('bcryptjs');

// Test password comparison
const testPassword = 'Admin123!';
const testHash = '$2b$10$tSSc82PjDhO2dF1NEN1ma.lN9LsTRj0g12ahtJJA0wgNPoneVxFYq';

console.log('Testing bcrypt comparison...');
console.log('Password:', testPassword);
console.log('Hash:', testHash);

bcrypt.compare(testPassword, testHash).then(result => {
  console.log('Match result:', result);

  if (result) {
    console.log('✅ Password matches hash!');

    // Now test actual login via API
    fetch('http://localhost:3030/api/auth/csrf')
      .then(res => res.json())
      .then(data => {
        const csrfToken = data.csrfToken;
        console.log('\nGot CSRF token:', csrfToken.substring(0, 20) + '...');

        return fetch('http://localhost:3030/api/auth/callback/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'admin@promptforge.com',
            password: testPassword,
            csrfToken: csrfToken,
            json: true
          })
        });
      })
      .then(res => {
        console.log('\nLogin response status:', res.status);
        console.log('Login response headers:', Object.fromEntries(res.headers.entries()));
        return res.json();
      })
      .then(data => {
        console.log('\nLogin response data:', data);

        if (data.url && !data.error) {
          console.log('✅ Login successful!');
        } else {
          console.log('❌ Login failed:', data.error || 'Unknown error');
        }
      })
      .catch(err => console.error('Error during login test:', err));
  } else {
    console.log('❌ Password does not match hash!');
  }
});
