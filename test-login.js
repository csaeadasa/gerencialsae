const fetch = require('node-fetch');

async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'csaeadasa@gmail.com', password: '123' }) // Using a dummy password or correct one
  });
  console.log("Login status:", loginRes.status);
  const cookie = loginRes.headers.get('set-cookie');
  console.log("Cookie:", cookie);
}
test();
