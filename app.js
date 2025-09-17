const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Создаём папку uploads, если её нет
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layout');

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

let tasks = [];

// Главная страница со списком задач
app.get('/', (req, res) => {
  const filter = req.query.status;
  let filteredTasks = tasks;

  if (filter === 'done') {
    filteredTasks = tasks.filter(task => task.status === 'done');
  } else if (filter === 'pending') {
    filteredTasks = tasks.filter(task => task.status === 'pending');
  }

  res.render('index', { tasks: filteredTasks, filter });
});

// Добавить задачу
app.post('/add', upload.single('attachment'), (req, res) => {
  const { title, dueDate } = req.body;
  const task = {
    id: Date.now(),
    title,
    dueDate,
    status: 'pending',
    file: req.file ? req.file.filename : null,
  };
  tasks.push(task);
  res.redirect('/');
});

// Обновить статус задачи
app.post('/status/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = task.status === 'pending' ? 'done' : 'pending';
  }
  res.redirect('/');
});

// Удалить задачу
app.post('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  tasks = tasks.filter(t => t.id !== id);
  res.redirect('/');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
