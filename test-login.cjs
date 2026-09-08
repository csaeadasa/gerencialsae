const test = async () => {
  const fetch = (await import('node-fetch')).default;
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'csaeadasa@gmail.com', password: '1234' }) 
  });
  console.log("Login status:", loginRes.status);
  const cookie = loginRes.headers.get('set-cookie');
  console.log("Cookie:", cookie);
  
  if (cookie) {
    const meRes = await fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Cookie': cookie.split(';')[0] }
    });
    console.log("Me status:", meRes.status);
    console.log("Me body:", await meRes.text());
  }
};
test();
