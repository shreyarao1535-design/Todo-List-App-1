import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, ListTodo, PenLine, Plus, Trash2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

type Filter = 'all' | 'active' | 'completed';
const STORAGE_KEY = 'daywell-tasks';

function readTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Task =>
      item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.completed === 'boolean' &&
      typeof item.createdAt === 'string'
    );
  } catch {
    return [];
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Home() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const composerRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const ignoreEditBlur = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Keep the in-memory list usable when browser storage is unavailable.
    }
  }, [tasks]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(
    () => tasks.filter((task) => filter === 'all' || (filter === 'active' ? !task.completed : task.completed)),
    [tasks, filter],
  );
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) {
      composerRef.current?.focus();
      return;
    }
    const task: Task = { id: makeId(), title, completed: false, createdAt: new Date().toISOString() };
    setTasks((current) => [task, ...current]);
    setDraft('');
    setFilter('all');
    composerRef.current?.focus();
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function beginEdit(task: Task) {
    setEditingId(task.id);
    setEditValue(task.title);
  }

  function saveEdit(id: string) {
    const title = editValue.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task));
    setEditingId(null);
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.completed));
    setConfirmClear(false);
    setFilter('all');
  }

  const emptyTitle = tasks.length === 0
    ? 'A little room to begin'
    : filter === 'active'
      ? 'Nothing left on your list'
      : 'A fresh little finish';
  const emptyCopy = tasks.length === 0
    ? 'Add one small next step above. You can figure out the rest as you go.'
    : filter === 'active'
      ? 'Every task is done for now. Take a breath; you earned it.'
      : 'Once you finish a task, it will find a place here.';

  return (
    <main className="app-shell" data-testid="page-todo-list">
      <div className="page-wrap">
        <header className="topbar">
          <div className="brand" data-testid="text-app-brand">
            <span className="brand-mark"><Check size={17} strokeWidth={2.5} /></span>
            <span>daywell</span>
          </div>
          <time className="today-label" dateTime={new Date().toISOString().slice(0, 10)} data-testid="text-current-date">
            {dateLabel}
          </time>
        </header>

        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">A softer way to get things done</p>
            <h1 id="page-title">Make space for<br /><em>what matters.</em></h1>
            <p className="hero-note">A small place for your next steps. No rush, no grand plan — just one thing at a time.</p>
          </div>
          <div className="sun-mark" aria-hidden="true"><span className="sun-core" /></div>
        </section>

        <section className="work-area" aria-label="Your task list">
          <div className="task-panel">
            <div className="panel-heading">
              <div>
                <h2>Your list</h2>
                <span className="task-count" data-testid="text-task-count">
                  {remainingCount === 0
                    ? tasks.length === 0 ? 'Start with one small thing' : 'You’re all caught up'
                    : `${remainingCount} ${remainingCount === 1 ? 'thing' : 'things'} to do, at your own pace`}
                </span>
              </div>
              <span className="count-pill" data-testid="status-open-count">{remainingCount} open</span>
            </div>

            <form className="composer" onSubmit={addTask} data-testid="form-add-task">
              <Plus size={17} className="composer-plus" aria-hidden="true" />
              <input
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="What’s one thing on your mind?"
                aria-label="New task"
                maxLength={180}
                data-testid="input-new-task"
              />
              <button className="add-button" type="submit" data-testid="button-add-task">Add task</button>
            </form>

            <div className="list-toolbar">
              <div className="filters" role="group" aria-label="Filter tasks">
                {(['all', 'active', 'completed'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-button${filter === value ? ' active' : ''}`}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                    data-testid={`button-filter-${value}`}
                  >
                    {value === 'all' ? 'All' : value === 'active' ? 'To do' : 'Done'}
                  </button>
                ))}
              </div>
              <button
                className="clear-button"
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={completedCount === 0}
                data-testid="button-clear-completed"
              >
                Clear completed
              </button>
            </div>

            {confirmClear && completedCount > 0 && (
              <div className="confirm-clear" role="alert" data-testid="dialog-clear-completed">
                <span>Remove {completedCount} finished {completedCount === 1 ? 'task' : 'tasks'} from your list?</span>
                <div className="confirm-actions">
                  <button className="confirm-cancel" type="button" onClick={() => setConfirmClear(false)} data-testid="button-cancel-clear">Keep them</button>
                  <button className="confirm-remove" type="button" onClick={clearCompleted} data-testid="button-confirm-clear">Clear them</button>
                </div>
              </div>
            )}

            <div className="task-list" role="list" aria-label="Tasks" data-testid="list-tasks">
              {visibleTasks.length === 0 ? (
                <div className="empty-state" data-testid="status-empty-tasks">
                  <span className="empty-icon"><ListTodo size={22} strokeWidth={1.7} /></span>
                  <h3>{emptyTitle}</h3>
                  <p>{emptyCopy}</p>
                </div>
              ) : visibleTasks.map((task) => (
                <div className={`task-row${task.completed ? ' is-done' : ''}`} role="listitem" key={task.id} data-testid={`row-task-${task.id}`}>
                  <button
                    type="button"
                    className={`check-button${task.completed ? ' checked' : ''}`}
                    aria-label={task.completed ? `Mark ${task.title} as to do` : `Complete ${task.title}`}
                    aria-pressed={task.completed}
                    onClick={() => toggleTask(task.id)}
                    data-testid={`button-toggle-task-${task.id}`}
                  >
                    {task.completed && <Check size={13} strokeWidth={2.8} />}
                  </button>
                  {editingId === task.id ? (
                    <input
                      ref={editRef}
                      className="edit-input"
                      value={editValue}
                      maxLength={180}
                      aria-label={`Edit ${task.title}`}
                      onChange={(event) => setEditValue(event.target.value)}
                      onBlur={() => {
                        if (ignoreEditBlur.current) {
                          ignoreEditBlur.current = false;
                          return;
                        }
                        saveEdit(task.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveEdit(task.id);
                        } else if (event.key === 'Escape') {
                          ignoreEditBlur.current = true;
                          setEditingId(null);
                        }
                      }}
                      data-testid={`input-edit-task-${task.id}`}
                    />
                  ) : (
                    <span className="task-title" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                  )}
                  <div className="row-actions">
                    {editingId === task.id ? (
                      <button className="icon-button" type="button" aria-label="Save task" onClick={() => saveEdit(task.id)} data-testid={`button-save-task-${task.id}`}>
                        <Check size={15} />
                      </button>
                    ) : (
                      <button className="icon-button" type="button" aria-label={`Edit ${task.title}`} onClick={() => beginEdit(task)} data-testid={`button-edit-task-${task.id}`}>
                        <PenLine size={14} />
                      </button>
                    )}
                    <button className="icon-button delete" type="button" aria-label={`Remove ${task.title}`} onClick={() => removeTask(task.id)} data-testid={`button-delete-task-${task.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="side-column" aria-label="Progress and encouragement">
            <section className="progress-card" data-testid="card-progress">
              <p className="progress-kicker">Your little progress</p>
              <div className="progress-number" data-testid="text-progress-percent">{progress}%</div>
              <p className="progress-copy" data-testid="text-progress-summary">
                {tasks.length === 0
                  ? 'A good day can start with just one thing.'
                  : completedCount === tasks.length
                    ? 'Look at you, giving yourself a little breathing room.'
                    : `${completedCount} of ${tasks.length} ${tasks.length === 1 ? 'step' : 'steps'} found their finish.`}
              </p>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="progress-task-completion"
              >
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </section>
            <blockquote className="little-note" data-testid="text-encouragement">
              <p>“Small steps still move you somewhere lovely.”</p>
              <span>A note for today</span>
            </blockquote>
          </aside>
        </section>

        <footer className="footer-note">
          <span>Keep it small. Keep it kind.</span>
          <span className="footer-spark" aria-hidden="true">—</span>
          <span>Your list stays on this device</span>
        </footer>
      </div>
    </main>
  );
}

export default function App() {
  return <Home />;
}
