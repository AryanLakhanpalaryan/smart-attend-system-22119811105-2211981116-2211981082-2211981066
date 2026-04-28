const http = require('http');

function postJSON(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (err) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const sessionId = 'SMOKE-' + Date.now();
    const createBody = {
      token: 'mock-token',
      session_id: sessionId,
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      name: 'Smoke Test Session',
      duration: '60',
      location: '0,0',
      radius: '50',
      teacherEmail: 'teacher@example.com',
    };
    console.log('Creating session:', sessionId);
    const created = await postJSON('/sessions/create', createBody);
    console.log('Create response:', created.statusCode, JSON.stringify(created.body));

    // simulate one attendee
    const simBody = {
      session_id: sessionId,
      student_name: 'Auto Sim',
      student_email: 'auto.sim@example.com',
      regno: 'SMK' + (Math.floor(Math.random() * 90000) + 10000),
    };
    console.log('Simulating attendee for session:', sessionId);
    const simulated = await postJSON('/sessions/simulate', simBody);
    console.log('Simulate response:', simulated.statusCode, JSON.stringify(simulated.body));
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
