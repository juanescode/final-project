let db;

const request = indexedDB.open('TareasDB', 1);

request.onerror = () => console.error('Error al abrir DB');
request.onsuccess = () => db = request.result;

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore('tareas', { keyPath: 'id', autoIncrement: true });
};

function saveTask(name, priority = 'normal') {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tareas', 'readwrite');
    const store = tx.objectStore('tareas');
    store.add({ 
      name, 
      completed: false,
      priority, 
      createdAt: new Date().toISOString() 
    });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

function getAllTasks() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tareas', 'readonly');
    const store = tx.objectStore('tareas');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

function updateTask(id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tareas', 'readwrite');
    const store = tx.objectStore('tareas');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const task = getRequest.result;
      if (task) {
        Object.assign(task, updates);
        const putRequest = store.put(task);
        putRequest.onsuccess = () => resolve(task);
        putRequest.onerror = reject;
      } else {
        reject(new Error('Tarea no encontrada'));
      }
    };
    getRequest.onerror = reject;
  });
}

function deleteTask(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tareas', 'readwrite');
    const store = tx.objectStore('tareas');
    const request = store.delete(id);
    request.onsuccess = resolve;
    request.onerror = reject;
  });
}