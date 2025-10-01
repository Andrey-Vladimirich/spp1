// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ensure uploads folder
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// middlewares
app.use(cors()); // если клиент с того же сервера — можно убрать, но безопасно оставить
app.use(express.json()); // for application/json
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR)); // serve files
app.use(express.static(path.join(__dirname, 'public'))); // SPA

// In-memory DB (tasks)
let tasks = []; // each: { id, title, dueDate, status: 'pending'|'done', file: filename|null, createdAt }

// Helper
function findTask(id) {
  return tasks.find(t => t.id === id);
}

// Routes (REST API)
app.get('/api/tasks', (req, res) => {
  // optional filter: ?status=pending|done
  const status = req.query.status;
  let result = tasks;
  if (status === 'pending' || status === 'done') {
    result = tasks.filter(t => t.status === status);
  }
  res.status(200).json(result);
});

app.get('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = findTask(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(200).json(task);
});

// Create task (supports multipart/form-data to upload file)
app.post('/api/tasks', upload.single('attachment'), (req, res) => {
  const { title, dueDate } = req.body;
  if (!title || title.trim() === '') {
    // bad request
    return res.status(400).json({ error: 'Title is required' });
  }
  const newTask = {
    id: Date.now(), // simple id
    title: title.trim(),
    dueDate: dueDate || null,
    status: 'pending',
    file: req.file ? req.file.filename : null,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  res.status(201).json(newTask); // 201 Created
});

// Update task (PUT) — supports JSON or multipart (file replacement)
app.put('/api/tasks/:id', upload.single('attachment'), (req, res) => {
  const id = Number(req.params.id);
  const task = findTask(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // if request is JSON
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const { title, dueDate, status } = req.body;
    if (title !== undefined) task.title = String(title).trim();
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (status === 'pending' || status === 'done') task.status = status;
    return res.status(200).json(task);
  }

  // if multipart/form-data (from form) — fields in req.body, file in req.file
  const { title, dueDate, status } = req.body;
  if (title !== undefined) task.title = String(title).trim();
  if (dueDate !== undefined) task.dueDate = dueDate || null;
  if (status === 'pending' || status === 'done') task.status = status;
  if (req.file) {
    // remove old file if exists
    if (task.file) {
      const old = path.join(UPLOAD_DIR, task.file);
      fs.unlink(old, () => {});
    }
    task.file = req.file.filename;
  }
  res.status(200).json(task);
});

// Patch status (toggle) — better semantic for partial update
app.patch('/api/tasks/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const task = findTask(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.status = task.status === 'pending' ? 'done' : 'pending';
  res.status(200).json(task);
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const [removed] = tasks.splice(idx, 1);
  // delete attached file if exists
  if (removed.file) {
    const p = path.join(UPLOAD_DIR, removed.file);
    fs.unlink(p, () => {});
  }
  // 204 No Content is OK, but send 200 with message for clarity
  res.status(204).send(); // resource deleted, no body
});

// fallback for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// serve SPA index.html for other routes (client-side routing potential)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start server
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
