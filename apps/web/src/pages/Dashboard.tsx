import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Database, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { db, deleteProject } from '../db/database';
import { ProjectCard } from '../features/projects/ProjectCard';
import { useUI } from '../store/ui';
import type { Theme } from '../store/theme';

export function Dashboard({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const projectsQuery = useLiveQuery(
    () => db.projects.orderBy('updatedAt').reverse().toArray(),
    [],
  );
  const projects = useMemo(() => projectsQuery ?? [], [projectsQuery]);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const screens = useLiveQuery(() => db.screens.toArray(), []);
  const notify = useUI((state) => state.notify);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const counts = useMemo(() => {
    const sessionList = sessions ?? [];
    const screenList = screens ?? [];
    return {
      sessions: sessionList.reduce<Record<string, typeof sessionList>>((groups, item) => {
        (groups[item.projectId] ??= []).push(item);
        return groups;
      }, {}),
      screens: screenList.reduce<Record<string, typeof screenList>>((groups, item) => {
        (groups[item.projectId] ??= []).push(item);
        return groups;
      }, {}),
    };
  }, [sessions, screens]);
  useEffect(() => {
    window.postMessage(
      {
        source: 'flowlens-web',
        type: 'FLOWLENS_SYNC_PROJECT_INDEX',
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          domain: project.domain,
          siteUrl: project.siteUrl,
          faviconUrl: project.faviconUrl,
          sessionCount: counts.sessions[project.id]?.length ?? 0,
          createdAt: project.createdAt,
        })),
      },
      window.location.origin,
    );
  }, [projects, counts.sessions]);
  const create = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    await db.projects.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      domain: '',
      createdAt: now,
      updatedAt: now,
    });
    setName('');
    setCreating(false);
    notify('Project created');
  };
  const clear = async () => {
    if (!confirm('Delete every local FlowLens project? This cannot be undone.')) return;
    await db.delete();
    await db.open();
    window.postMessage(
      { source: 'flowlens-web', type: 'FLOWLENS_CLEAR_PROJECTS' },
      window.location.origin,
    );
    notify('All local data deleted');
  };
  const remove = async (projectId: string) => {
    await deleteProject(projectId);
    window.postMessage(
      { source: 'flowlens-web', type: 'FLOWLENS_DELETE_PROJECT', projectId },
      window.location.origin,
    );
    notify('Project and all related data deleted');
  };
  return (
    <div className="dashboard">
      <header className="app-header">
        <a className="brand" href="/">
          <img src="/brand/flowlens-icon.png" alt="" />
          <span className="brand-wordmark">
            Flow<span>Lens</span>
          </span>
        </a>
        <nav>
          <button
            className="icon-button theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="button danger-text" onClick={() => void clear()}>
            <Trash2 size={16} /> Clear local data
          </button>
        </nav>
      </header>
      <main className="dashboard-main">
        <div className="hero">
          <div>
            <span className="eyebrow">LOCAL WORKFLOW STUDIO</span>
            <h1>Turn journeys into clear product flows.</h1>
            <p>
              Record with the Chrome extension, then review, connect, annotate, and share every
              screen from one private workspace.
            </p>
          </div>
          <button className="button primary large" onClick={() => setCreating(true)}>
            <Plus size={18} /> New project
          </button>
        </div>
        {creating && (
          <form
            className="new-project"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label>
              Project name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Checkout redesign"
              />
            </label>
            <button className="button primary" disabled={!name.trim()}>
              Create
            </button>
            <button className="button" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </form>
        )}
        <section>
          <div className="section-title">
            <div>
              <h2>Your projects</h2>
              <p>
                {projects.length} project{projects.length === 1 ? '' : 's'} stored in this browser
              </p>
            </div>
            <Database size={20} />
          </div>
          {projects.length ? (
            <div className="project-grid">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  screens={counts.screens[project.id]?.length ?? 0}
                  sessions={counts.sessions[project.id]?.length ?? 0}
                  onDelete={() => {
                    if (confirm(`Delete “${project.name}” and all of its local data?`))
                      void remove(project.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <img src="/brand/flowlens-icon.png" alt="" />
              <h3>No workflows yet</h3>
              <p>Start a recording from the extension.</p>
              <button className="button primary" onClick={() => setCreating(true)}>
                <Plus size={16} /> Create a project
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="app-footer">
        <span>FlowLens stores workflows in your browser.</span>
        <a href="/privacy">Privacy policy</a>
      </footer>
    </div>
  );
}
