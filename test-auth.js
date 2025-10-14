const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAuth() {
  console.log('Testing login endpoint...');

  try {
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.access_token) {
      console.log('\nTesting protected endpoint...');
      const ideasResponse = await fetch('http://localhost:3000/api/v1/ideas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.access_token}`
        },
        body: JSON.stringify({
          title: 'Test Idea',
          description: 'Testing JWT authentication'
        })
      });

      console.log('Ideas response status:', ideasResponse.status);
      const ideasData = await ideasResponse.json();
      console.log('Ideas response:', ideasData);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();
