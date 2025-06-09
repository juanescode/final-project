if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    console.log('SW registrado correctamente');
  });
}

let editingTaskId = null;
let currentTab = 'pending';

document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const prioritySelect = document.getElementById('priority-select');
  const submitBtn = document.getElementById('submit-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  loadTasks();

  taskForm.addEventListener('submit', handleSubmit);
  refreshBtn.addEventListener('click', handleRefresh);
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const task = taskInput.value.trim();
    const priority = prioritySelect.value;
    
    if (task) {
      if (editingTaskId) {
        await updateTask(editingTaskId, { name: task, priority });
        cancelEdit();
        showNotification('Tarea actualizada correctamente');
      } else {
        await saveTask(task, priority);
        showNotification('Tarea agregada correctamente');
      }
      taskInput.value = '';
      prioritySelect.value = 'normal';
      loadTasks();
    }
  }

  async function handleRefresh() {
    refreshBtn.classList.add('spinning');
    await loadTasks();
    showNotification('Lista actualizada');
    setTimeout(() => {
      refreshBtn.classList.remove('spinning');
    }, 500);
  }
});

async function loadTasks() {
  const tasks = await getAllTasks();
  
  const pendingTasks = tasks.filter(t => !t.completed && t.priority !== 'important');
  const importantTasks = tasks.filter(t => !t.completed && t.priority === 'important');
  const completedTasks = tasks.filter(t => t.completed);

  updateCounts(pendingTasks.length, importantTasks.length, completedTasks.length);

  renderTaskList('pending-list', pendingTasks);
  renderTaskList('important-list', importantTasks);
  renderTaskList('completed-list', completedTasks);
}

function updateCounts(pending, important, completed) {
  document.getElementById('pending-count').textContent = pending;
  document.getElementById('important-count').textContent = important;
  document.getElementById('completed-count').textContent = completed;
}

function renderTaskList(listId, tasks) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  
  if (tasks.length === 0) {
    const emptyMessage = getEmptyMessage(listId);
    list.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}`;
    li.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask(${task.id})">
        <span class="task-text">
          ${task.priority === 'important' ? '⭐ ' : ''}${escapeHtml(task.name)}
        </span>
        <span class="task-date">${formatDate(task.createdAt)}</span>
      </div>
      <div class="task-actions">
        ${!task.completed ? `
          <button class="edit-btn" onclick="editTask(${task.id}, '${escapeHtml(task.name).replace(/'/g, "\\'")}', '${task.priority}')" title="Editar">
            ✏️
          </button>
        ` : ''}
        <button class="delete-btn" onclick="confirmDelete(${task.id})" title="Eliminar">
          🗑️
        </button>
      </div>
    `;
    list.appendChild(li);
  });
}

function getEmptyMessage(listId) {
  const messages = {
    'pending-list': '📝 No hay tareas pendientes',
    'important-list': '⭐ No hay tareas importantes',
    'completed-list': '✅ No hay tareas completadas'
  };
  return messages[listId] || 'No hay tareas';
}

function switchTab(tabName) {
  currentTab = tabName;
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function toggleTask(id) {
  try {
    const tasks = await getAllTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      await updateTask(id, { completed: !task.completed });
      loadTasks();
      
      const message = task.completed ? 'Tarea marcada como pendiente' : 'Tarea completada 🎉';
      showNotification(message);
      
      if (!task.completed) {
        setTimeout(() => switchTab('completed'), 500);
      }
    }
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    showNotification('Error al actualizar la tarea', 'error');
  }
}

function editTask(id, name, priority) {
  const taskInput = document.getElementById('task-input');
  const prioritySelect = document.getElementById('priority-select');
  const submitBtn = document.getElementById('submit-btn');
  
  editingTaskId = id;
  taskInput.value = name;
  prioritySelect.value = priority;
  taskInput.focus();
  submitBtn.textContent = 'Actualizar';
  submitBtn.classList.add('editing');
}

function cancelEdit() {
  const taskInput = document.getElementById('task-input');
  const prioritySelect = document.getElementById('priority-select');
  const submitBtn = document.getElementById('submit-btn');
  
  editingTaskId = null;
  taskInput.value = '';
  prioritySelect.value = 'normal';
  submitBtn.textContent = 'Agregar';
  submitBtn.classList.remove('editing');
}

function confirmDelete(id) {
  if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    deleteTaskById(id);
  }
}

async function deleteTaskById(id) {
  try {
    await deleteTask(id);
    loadTasks();
    showNotification('Tarea eliminada correctamente');
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    showNotification('Error al eliminar la tarea', 'error');
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editingTaskId) {
    cancelEdit();
  }
  
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case '1':
        e.preventDefault();
        switchTab('pending');
        break;
      case '2':
        e.preventDefault();
        switchTab('important');
        break;
      case '3':
        e.preventDefault();
        switchTab('completed');
        break;
      case 'r':
        e.preventDefault();
        document.getElementById('refresh-btn').click();
        break;
    }
  }
});