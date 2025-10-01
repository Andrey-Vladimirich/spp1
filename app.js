// public/app.js
const apiBase = '/api/tasks';

const addForm = document.getElementById('addForm');
const tasksList = document.getElementById('tasksList');
const filterSelect = document.getElementById('filterSelect');

async function fetchTasks() {
  const status = filterSelect.value;
  const url = status ? `${apiBase}?status=${encodeURIComponent(status)}` : apiBase;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Ошибка получения задач', res.status);
    return [];
  }
  return res.json();
}

function renderTasks(tasks) {
  tasksList.innerHTML = '';
  if (tasks.length === 0) {
    tasksList.innerHTML = '<li>Задач пока нет 👌</li>';
    return;
  }
  tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task ' + (t.status === 'done' ? 'done' : 'pending');

    const statusBtn = document.createElement('button');
    statusBtn.className = 'status-btn';
    statusBtn.textContent = t.status === 'done' ? '✔' : '✗';
    statusBtn.title = 'Переключить статус';
    statusBtn.addEventListener('click', async () => {
      await toggleStatus(t.id);
      await refresh();
    });

    const content = document.createElement('div');
    content.className = 'task-content';
    const title = document.createElement('strong');
    title.textContent = t.title;
    content.appendChild(title);

    if (t.dueDate) {
      const due = document.createElement('span');
      due.className = 'due';
      due.textContent = 'до ' + t.dueDate;
      content.appendChild(due);
    }
    if (t.file) {
      const a = document.createElement('a');
      a.href = `/uploads/${t.file}`;
      a.target = '_blank';
      a.className = 'file-link';
      a.textContent = '📎 Файл';
      content.appendChild(a);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '🗑';
    delBtn.title = 'Удалить задачу';
    delBtn.addEventListener('click', async () => {
      if (!confirm('Удалить задачу?')) return;
      await deleteTask(t.id);
      await refresh();
    });

    li.appendChild(statusBtn);
    li.appendChild(content);
    li.appendChild(delBtn);

    tasksList.appendChild(li);
  });
}

async function refresh() {
  const tasks = await fetchTasks();
  renderTasks(tasks);
}

async function addTaskFormHandler(e) {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const dueDate = document.getElementById('dueDate').value;
  const attachment = document.getElementById('attachment').files[0];

  if (!title) return alert('Введите название');

  // send multipart/form-data
  const form = new FormData();
  form.append('title', title);
  if (dueDate) form.append('dueDate', dueDate);
  if (attachment) form.append('attachment', attachment);

  const res = await fetch(apiBase, {
    method: 'POST',
    body: form
  });

  if (res.status === 201) {
    addForm.reset();
    await refresh();
  } else {
    const err = await res.json().catch(() => ({ error: 'Unknown' }));
    alert('Ошибка создания: ' + (err.error || res.status));
  }
}

async function toggleStatus(id) {
  const res = await fetch(`${apiBase}/${id}/status`, { method: 'PATCH' });
  if (!res.ok) {
    console.error('Не удалось переключить статус', res.status);
  }
}

async function deleteTask(id) {
  const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' });
  if (res.status === 204) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Ошибка удаления: ' + (err.error || res.status));
  }
}

// events
addForm.addEventListener('submit', addTaskFormHandler);
filterSelect.addEventListener('change', refresh);

// initial load
refresh();
