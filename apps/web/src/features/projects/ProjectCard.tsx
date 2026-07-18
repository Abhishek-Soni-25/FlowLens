import type { Project } from '@flowlens/shared';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectIcon } from './ProjectIcon';
export function ProjectCard({
  project,
  screens,
  sessions,
  onDelete,
}: {
  project: Project;
  screens: number;
  sessions: number;
  onDelete: () => void;
}) {
  const siteUrl = project.siteUrl ?? (project.domain ? `https://${project.domain}` : undefined);
  return (
    <article className="project-card">
      <div className="project-icon">
        <ProjectIcon faviconUrl={project.faviconUrl} />
      </div>
      <div className="project-title">
        <h3>{project.name}</h3>
        {siteUrl ? (
          <a href={siteUrl} target="_blank" rel="noreferrer">
            {project.domain}
          </a>
        ) : (
          <span>Local project</span>
        )}
      </div>
      <dl>
        <div>
          <dt>Screens</dt>
          <dd>{screens}</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd>{sessions}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{new Date(project.updatedAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <div className="card-actions">
        <Link className="button primary" to={`/project/${project.id}`}>
          Open <ArrowRight size={15} />
        </Link>
        <button
          className="icon-button danger-text"
          aria-label={`Delete ${project.name}`}
          onClick={onDelete}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}
