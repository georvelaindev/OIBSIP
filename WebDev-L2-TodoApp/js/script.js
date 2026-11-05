/* ==========================================================
   StudyFlow – Smart To-Do App
   OIBSIP – Web Development & Designing, Level 2, Task 3
   JavaScript Vanilla + LocalStorage (aucune dépendance)
   ========================================================== */
(() => {
  'use strict';

  /* ---------- 1. Constantes et état ---------- */
  const STORAGE_KEY = 'studyflow.tasks.v1';
  const THEME_KEY = 'studyflow.theme';
  const MOVE_DELAY = 300; // durée de l'animation de sortie (ms), alignée sur le CSS

  const QUOTES = [
    'Un petit pas aujourd\'hui vaut mieux qu\'un grand plan demain.',
    'Termine une tâche, puis la suivante : la progression suit.',
    'La régularité bat l\'intensité. Avance à ton rythme.',
    'Ce qui est écrit se fait plus facilement. Note-le, puis réalise-le.',
    'Une tâche à la fois, et la journée prend forme.'
  ];

  const THEME_ICONS = {
    light: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    dark: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
  };

  let tasks = [];
  const state = {
    view: 'dashboard',      // dashboard | tasks | settings
    filter: 'all',          // all | pending | done
    sort: 'created-desc',
    query: '',
    editingId: null,
    onConfirm: null,        // action à exécuter après confirmation
    highlightId: null       // tâche à animer après un déplacement
  };

  /* ---------- 2. Raccourcis DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    body: document.body,
    navButtons: document.querySelectorAll('.nav-btn'),
    sections: document.querySelectorAll('[data-show]'),
    menuBtn: $('menuBtn'), scrim: $('scrim'),
    themeBtn: $('themeBtn'), themeIcon: $('themeIcon'),
    todayDate: $('todayDate'), quote: $('quote'), quickAddBtn: $('quickAddBtn'),
    statTotal: $('statTotal'), statPending: $('statPending'), statDone: $('statDone'),
    statProgress: $('statProgress'), progressBar: $('progressBar'), progressFill: $('progressFill'),
    navAll: $('navAll'), navPending: $('navPending'), navDone: $('navDone'),
    form: $('taskForm'), titleInput: $('titleInput'), descInput: $('descInput'), dueInput: $('dueInput'), titleError: $('titleError'),
    searchInput: $('searchInput'), filterSelect: $('filterSelect'), sortSelect: $('sortSelect'),
    pendingSection: $('pendingSection'), doneSection: $('doneSection'),
    pendingList: $('pendingList'), doneList: $('doneList'),
    pendingCount: $('pendingCount'), doneCount: $('doneCount'),
    clearAllBtn: $('clearAllBtn'),
    editDialog: $('editDialog'), editForm: $('editForm'), editTitleInput: $('editTitleInput'),
    editDescInput: $('editDescInput'), editDueInput: $('editDueInput'), editError: $('editError'), editCancel: $('editCancel'),
    confirmDialog: $('confirmDialog'), confirmText: $('confirmText'), confirmCancel: $('confirmCancel'), confirmOk: $('confirmOk'),
    toasts: $('toasts')
  };

  /* ---------- 3. Utilitaires ---------- */
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /** Date du jour au format AAAA-MM-JJ (heure locale), pour comparer aux dates limites. */
  function todayString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatDate(iso, withTime = false) {
    if (!iso) return '';
    // Une date limite « AAAA-MM-JJ » est lue en heure locale pour éviter un décalage d'un jour
    const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00') : new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const options = withTime
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  /** Minuscules sans accents, pour une recherche tolérante. */
  const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isOverdue = (task) => !task.done && Boolean(task.dueDate) && task.dueDate < todayString();

  /* ---------- 4. LocalStorage ---------- */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data.filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string');
    } catch (error) {
      console.error('Lecture du LocalStorage impossible :', error);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Sauvegarde impossible :', error);
      showToast('Sauvegarde impossible : le stockage du navigateur est indisponible.', 'error');
    }
  }

  /* ---------- 5. Notifications ---------- */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    el.toasts.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  /* ---------- 6. Thème ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    // L'icône montre le thème vers lequel on bascule
    el.themeIcon.innerHTML = THEME_ICONS[theme];
    el.themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre');
    document.querySelectorAll('[data-theme-set]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeSet === theme));
    });
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { console.error(error); }
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (error) { console.error(error); }
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved === 'dark' || saved === 'light' ? saved : preferred);
  }

  /* ---------- 7. Navigation ---------- */
  function setView(view, filter = state.filter) {
    state.view = view;
    state.filter = filter;
    el.filterSelect.value = filter;
    el.navButtons.forEach((btn) => {
      const active = btn.dataset.view === view && (view === 'settings' || btn.dataset.filter === filter)
        && !(view === 'tasks' && btn.dataset.view === 'dashboard');
      if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
    closeMenu();
    render();
  }

  function openMenu() {
    el.body.classList.add('menu-open');
    el.scrim.hidden = false;
    el.menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    el.body.classList.remove('menu-open');
    el.scrim.hidden = true;
    el.menuBtn.setAttribute('aria-expanded', 'false');
  }

  /* ---------- 8. Rendu ---------- */
  const comparators = {
    'created-desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
    'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
    // Les tâches sans date limite passent en dernier
    'due-asc': (a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
  };

  function getVisibleTasks(done) {
    const query = normalize(state.query.trim());
    return tasks
      .filter((t) => t.done === done)
      .filter((t) => !query || normalize(`${t.title} ${t.description || ''}`).includes(query))
      .sort(comparators[state.sort]);
  }

  function makeButton(label, action, className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn-sm ${className}`;
    btn.dataset.action = action;
    btn.textContent = label;
    return btn;
  }

  function makeMeta(text, className) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    return span;
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task' + (task.done ? ' is-done' : '') + (isOverdue(task) ? ' is-late' : '');
    li.dataset.id = task.id;
    if (task.id === state.highlightId) li.classList.add('arriving');

    const title = document.createElement('p');
    title.className = 'task-title';
    title.textContent = task.title;
    li.appendChild(title);

    if (task.description && !task.done) {
      const desc = document.createElement('p');
      desc.className = 'task-desc';
      desc.textContent = task.description;
      li.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.appendChild(makeMeta('Créée le ' + formatDate(task.createdAt, true)));
    if (task.done && task.completedAt) meta.appendChild(makeMeta('Terminée le ' + formatDate(task.completedAt, true)));
    if (task.dueDate && !task.done) meta.appendChild(makeMeta('Date limite : ' + formatDate(task.dueDate)));
    if (isOverdue(task)) meta.appendChild(makeMeta('En retard', 'chip-late'));
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    if (task.done) {
      actions.appendChild(makeButton('Remettre en attente', 'reopen', 'btn-ghost'));
    } else {
      actions.appendChild(makeButton('Terminer', 'complete', 'btn-ok'));
    }
    actions.appendChild(makeButton('Modifier', 'edit', 'btn-ghost'));
    actions.appendChild(makeButton('Supprimer', 'delete', 'btn-danger'));
    li.appendChild(actions);
    return li;
  }

  function renderList(listEl, items, emptyTitle, emptyText) {
    listEl.replaceChildren();
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      const strong = document.createElement('strong');
      strong.textContent = state.query.trim() ? 'Aucun résultat' : emptyTitle;
      li.append(strong, state.query.trim() ? `Aucune tâche ne correspond à « ${state.query.trim()} ».` : emptyText);
      listEl.appendChild(li);
      return;
    }
    items.forEach((task) => listEl.appendChild(createTaskElement(task)));
  }

  function renderStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const pending = total - done;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    el.statTotal.textContent = total;
    el.statPending.textContent = pending;
    el.statDone.textContent = done;
    el.statProgress.textContent = `${progress} %`;
    el.progressFill.style.width = `${progress}%`;
    el.progressBar.setAttribute('aria-valuenow', String(progress));
    el.navAll.textContent = total;
    el.navPending.textContent = pending;
    el.navDone.textContent = done;
    el.pendingCount.textContent = pending;
    el.doneCount.textContent = done;
  }

  function render() {
    // Afficher uniquement les blocs de la vue courante
    el.sections.forEach((section) => {
      section.hidden = !section.dataset.show.split(' ').includes(state.view);
    });

    renderStats();

    const showLists = state.view !== 'settings';
    el.pendingSection.hidden = !showLists || state.filter === 'done';
    el.doneSection.hidden = !showLists || state.filter === 'pending';

    renderList(el.pendingList, getVisibleTasks(false), 'Rien en attente', 'Ajoute une tâche pour démarrer ta journée.');
    renderList(el.doneList, getVisibleTasks(true), 'Aucune tâche terminée', 'Les tâches que tu termines apparaîtront ici.');
    state.highlightId = null;
  }

  /* ---------- 9. Actions sur les tâches ---------- */
  function validateTitle(value, inputEl, errorEl) {
    if (value.trim() === '') {
      errorEl.textContent = 'Saisis un titre pour ajouter la tâche.';
      errorEl.hidden = false;
      inputEl.setAttribute('aria-invalid', 'true');
      inputEl.focus();
      return false;
    }
    errorEl.hidden = true;
    inputEl.removeAttribute('aria-invalid');
    return true;
  }

  function addTask(event) {
    event.preventDefault();
    if (!validateTitle(el.titleInput.value, el.titleInput, el.titleError)) return;

    const task = {
      id: generateId(),
      title: el.titleInput.value.trim(),
      description: el.descInput.value.trim(),
      dueDate: el.dueInput.value || '',
      createdAt: new Date().toISOString(),
      completedAt: null,
      done: false
    };
    tasks.push(task);
    state.highlightId = task.id;
    saveTasks();
    el.form.reset();
    // La nouvelle tâche doit être visible dans « En attente » : on retire un éventuel filtre contraire
    state.query = '';
    el.searchInput.value = '';
    if (state.filter === 'done') { state.filter = 'all'; el.filterSelect.value = 'all'; }
    render();
    showToast('Tâche ajoutée.', 'success');
  }

  function setDone(id, done) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const li = document.querySelector(`.task[data-id="${id}"]`);
    const apply = () => {
      task.done = done;
      task.completedAt = done ? new Date().toISOString() : null;
      state.highlightId = id;
      saveTasks();
      render();
      showToast(done ? 'Tâche terminée.' : 'Tâche remise en attente.', 'success');
    };
    // Animation de sortie avant le déplacement vers l'autre liste
    if (li) { li.classList.add('leaving'); setTimeout(apply, MOVE_DELAY); } else { apply(); }
  }

  function openEdit(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    state.editingId = id;
    el.editTitleInput.value = task.title;
    el.editDescInput.value = task.description || '';
    el.editDueInput.value = task.dueDate || '';
    el.editError.hidden = true;
    el.editTitleInput.removeAttribute('aria-invalid');
    el.editDialog.showModal();
    el.editTitleInput.focus();
  }

  function saveEdit(event) {
    event.preventDefault();
    if (!validateTitle(el.editTitleInput.value, el.editTitleInput, el.editError)) return;
    const task = tasks.find((t) => t.id === state.editingId);
    if (!task) return;
    task.title = el.editTitleInput.value.trim();
    task.description = el.editDescInput.value.trim();
    task.dueDate = el.editDueInput.value || '';
    saveTasks();
    el.editDialog.close();
    render();
    showToast('Tâche modifiée.', 'success');
  }

  function askConfirm(text, okLabel, onConfirm) {
    el.confirmText.textContent = text;
    el.confirmOk.textContent = okLabel;
    state.onConfirm = onConfirm;
    el.confirmDialog.showModal();
  }

  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    askConfirm(`Supprimer définitivement « ${task.title} » ? Cette action est irréversible.`, 'Supprimer', () => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
      showToast('Tâche supprimée.', 'error');
    });
  }

  function clearAllTasks() {
    if (tasks.length === 0) { showToast('Aucune tâche à supprimer.'); return; }
    askConfirm(`Supprimer les ${tasks.length} tâches enregistrées ? Cette action est irréversible.`, 'Tout supprimer', () => {
      tasks = [];
      saveTasks();
      render();
      showToast('Toutes les tâches ont été supprimées.', 'error');
    });
  }

  /* ---------- 10. Événements ---------- */
  function handleListClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('.task')?.dataset.id;
    if (!id) return;
    const actions = {
      complete: () => setDone(id, true),
      reopen: () => setDone(id, false),
      edit: () => openEdit(id),
      delete: () => deleteTask(id)
    };
    actions[btn.dataset.action]?.();
  }

  function bindEvents() {
    el.form.addEventListener('submit', addTask);
    el.titleInput.addEventListener('input', () => { el.titleError.hidden = true; el.titleInput.removeAttribute('aria-invalid'); });
    el.pendingList.addEventListener('click', handleListClick);
    el.doneList.addEventListener('click', handleListClick);

    el.navButtons.forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.view, btn.dataset.filter)));
    el.quickAddBtn.addEventListener('click', () => {
      setView('dashboard', 'all');
      el.titleInput.focus();
      el.titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    el.searchInput.addEventListener('input', () => { state.query = el.searchInput.value; render(); });
    el.filterSelect.addEventListener('change', () => { state.filter = el.filterSelect.value; render(); });
    el.sortSelect.addEventListener('change', () => { state.sort = el.sortSelect.value; render(); });

    el.themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.querySelectorAll('[data-theme-set]').forEach((btn) => btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet)));
    el.clearAllBtn.addEventListener('click', clearAllTasks);

    el.menuBtn.addEventListener('click', () => (el.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
    el.scrim.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    el.editForm.addEventListener('submit', saveEdit);
    el.editCancel.addEventListener('click', () => el.editDialog.close());
    el.confirmCancel.addEventListener('click', () => { state.onConfirm = null; el.confirmDialog.close(); });
    el.confirmOk.addEventListener('click', () => {
      const action = state.onConfirm;
      state.onConfirm = null;
      el.confirmDialog.close();
      if (action) action();
    });
  }

  /* ---------- 11. Initialisation ---------- */
  function init() {
    tasks = loadTasks();
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    el.todayDate.textContent = today.charAt(0).toUpperCase() + today.slice(1);
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    el.quote.textContent = QUOTES[dayOfYear % QUOTES.length];
    initTheme();
    bindEvents();
    setView('dashboard', 'all');
  }

  init();
})();
