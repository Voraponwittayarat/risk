async function testLogin() {
  try {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'panupong',
        password: '123456'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Login Success:', Object.keys(data));
    console.log('Data:', data);
  } catch (e) {
    console.error('Login Failed:', e);
  }
}
testLogin();
