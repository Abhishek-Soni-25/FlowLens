import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('renders project metadata and open action', () => {
    render(
      <MemoryRouter>
        <ProjectCard
          project={{
            id: 'p',
            name: 'Checkout',
            domain: 'shop.test',
            createdAt: '2026-07-18T00:00:00.000Z',
            updatedAt: '2026-07-18T00:00:00.000Z',
          }}
          screens={2}
          sessions={1}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('shop.test')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/project/p');
  });
});
