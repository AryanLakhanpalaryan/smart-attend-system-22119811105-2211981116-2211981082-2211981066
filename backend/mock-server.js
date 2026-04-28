import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.resolve(process.cwd(), "mock-db.json");

app.use(cors({ origin: "http://10.209.166.79:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], sessions: [] };
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

app.get("/users", (req, res) => {
  const db = readDb();
  res.json(db.users);
});

app.post("/users/signup", (req, res) => {
  const { name, email, pno, dob, type, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const db = readDb();
  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }
  const user = { id: Date.now().toString(), name, email, pno, dob, type, password };
  db.users.push(user);
  writeDb(db);
  return res.status(201).json({ user, message: "User created (mock)" });
});

app.post("/users/signin", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  const db = readDb();
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  return res.status(200).json({ user: { email: user.email, id: user.id, name: user.name, pno: user.pno, dob: user.dob }, type: user.type, token: "mock-token" });
});

app.post("/users/forgotpassword", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and new password are required" });
  }

  const db = readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ message: "No such User" });
  }

  user.password = password;
  writeDb(db);
  return res.status(200).json({ message: "Password changed successfully" });
});

// Sessions endpoints
app.post("/sessions/create", (req, res) => {
  const { token, session_id, date, time, name, duration, location, radius, teacherEmail } = req.body;
  if (!session_id || !name || !teacherEmail) return res.status(400).json({ message: "Missing required fields" });
  const db = readDb();
  const session = { session_id, date, time, name, duration, location, radius, teacherEmail };
  db.sessions = db.sessions || [];
  db.sessions.push(session);
  writeDb(db);
  // Build a frontend URL reachable from mobile devices.
  // Priority: process.env.CLIENT_URL, else detect LAN IP, else localhost fallback.
  function getFrontendOrigin() {
    if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/$/, "");
    const frontendPort = process.env.FRONTEND_PORT || 3000; // default to create-react-app port
    // find first non-internal IPv4 address
    const netIfs = os.networkInterfaces();
    for (const name of Object.keys(netIfs)) {
      for (const iface of netIfs[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          console.log(`QR Code will use IP: ${iface.address}:${frontendPort}`);
          return `http://${iface.address}:${frontendPort}`;
        }
      }
    }
    // Fallback to localhost only if no LAN IP found
    console.log(`No LAN IP detected. QR Code will use: localhost:${frontendPort}`);
    return `http://localhost:${frontendPort}`;
  }

  const frontendOrigin = getFrontendOrigin();
  const url = `${frontendOrigin}/student-dashboard?session_id=${session_id}&email=${encodeURIComponent(teacherEmail)}`;
  return res.status(201).json({ session, url });
});

app.post("/sessions/getSessions", (req, res) => {
  const { token, email } = req.body;
  const db = readDb();
  db.sessions = db.sessions || [];
  const sessions = email ? db.sessions.filter((s) => s.teacherEmail === email) : db.sessions;
  return res.status(200).json({ sessions });
});

app.post("/sessions/delete", (req, res) => {
  const { session_id, email } = req.body;
  if (!session_id) return res.status(400).json({ message: "session_id required" });
  const db = readDb();
  db.sessions = db.sessions || [];
  const idx = db.sessions.findIndex((s) => s.session_id === session_id && (!email || s.teacherEmail === email));
  if (idx === -1) return res.status(404).json({ message: "Session not found" });
  db.sessions.splice(idx, 1);
  writeDb(db);
  return res.status(200).json({ message: "Session deleted" });
});

app.post("/sessions/attendees", (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ message: "session_id required" });
  const db = readDb();
  db.sessions = db.sessions || [];
  const session = db.sessions.find((s) => s.session_id === session_id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  // attendance may be undefined; return empty array if so
  const attendees = session.attendance || [];
  return res.status(200).json({ attendees });
});

// Simulate a student scanning the QR to mark attendance (development helper)
app.post("/sessions/simulate", (req, res) => {
  const { session_id, student_name, student_email, regno } = req.body;
  if (!session_id) return res.status(400).json({ message: "session_id required" });
  const db = readDb();
  db.sessions = db.sessions || [];
  const session = db.sessions.find((s) => s.session_id === session_id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  const attendee = {
    regno: regno || `R${Math.floor(Math.random() * 9000) + 1000}`,
    student_name: student_name || "Demo Student",
    student_email: student_email || `student${Date.now() % 10000}@example.com`,
    date: new Date().toISOString(),
    IP: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0').toString(),
    distance: Math.floor(Math.random() * 50),
  };
  session.attendance = session.attendance || [];
  session.attendance.push(attendee);
  writeDb(db);
  return res.status(201).json({ attendee });
});

// Endpoint for student to attend a session (scanned QR)
app.post("/sessions/attend_session", (req, res) => {
  // Accept JSON body with fields: session_id, regno, student_email, Location, IP, date, image
  const { session_id, regno, student_email, Location, IP, date } = req.body;
  if (!session_id || !regno) return res.status(400).json({ message: "session_id and regno required" });
  const db = readDb();
  db.sessions = db.sessions || [];
  const session = db.sessions.find((s) => s.session_id === session_id);
  if (!session) return res.status(404).json({ message: "Session not found" });

  // compute simple distance if possible (distance in meters) — approximate using lat/lng if provided
  let distance = 0;
  try {
    if (Location && session.location) {
      const [lat1, lon1] = Location.split(",").map((v) => parseFloat(v));
      const [lat2, lon2] = session.location.split(",").map((v) => parseFloat(v));
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance = Math.round(R * c);
    }
  } catch (err) {
    distance = 0;
  }

  session.attendance = session.attendance || [];
  // Prevent duplicate attendance by registration number OR by student_email (if provided)
  const existing = session.attendance.find((a) => {
    if (regno && a.regno && a.regno.toString().toLowerCase() === regno.toString().toLowerCase()) return true;
    if (student_email && a.student_email && a.student_email.toString().toLowerCase() === student_email.toString().toLowerCase()) return true;
    return false;
  });
  if (existing) {
    return res.status(409).json({ message: "Attendance already recorded for this student (regno or email)", attendee: existing });
  }

  const attendee = {
    regno,
    student_email: student_email || "",
    student_name: "",
    date: date || new Date().toISOString(),
    IP: IP || (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0').toString(),
    distance,
    image: req.body.image || undefined,
  };

  session.attendance.push(attendee);
  writeDb(db);
  return res.status(201).json({ message: "Attendance recorded", attendee });
});

// Bulk simulate attendees: POST { session_id, count }
app.post('/sessions/simulate-bulk', (req, res) => {
  const { session_id, count } = req.body;
  if (!session_id) return res.status(400).json({ message: 'session_id required' });
  const db = readDb();
  db.sessions = db.sessions || [];
  const session = db.sessions.find((s) => s.session_id === session_id);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  session.attendance = session.attendance || [];
  const added = [];
  for (let i = 0; i < (Number(count) || 10); i++) {
    // generate unique regno and email for simulated attendee
    let regno;
    let email;
    let attempts = 0;
    do {
      regno = `SIM${Math.floor(Math.random() * 900000) + 100000}`;
      email = `sim${Math.floor(Math.random() * 900000)}@example.com`;
      attempts++;
      if (attempts > 20) break;
    } while (session.attendance.find(a => a.regno === regno || (a.student_email && a.student_email === email)));
    const attendee = {
      regno,
      student_email: email,
      student_name: `Sim Student ${i+1}`,
      date: new Date().toISOString(),
      IP: '127.0.0.1',
      distance: 0,
    };
    session.attendance.push(attendee);
    added.push(attendee);
  }
  writeDb(db);
  return res.status(201).json({ message: 'Bulk simulated attendees added', added, total: session.attendance.length });
});

app.listen(PORT, () => {
  console.log(`Mock server listening on port ${PORT}`);
});
