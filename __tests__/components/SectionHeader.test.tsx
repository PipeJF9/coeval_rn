import React from 'react';
import { render } from '@testing-library/react-native';
import { SectionHeader } from '../../src/presentation/components/SectionHeader';

describe('SectionHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<SectionHeader title="Mis cursos" />);
    expect(getByText('Mis cursos')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    const { getByText } = render(
      <SectionHeader title="Cursos" subtitle="Resultados del semestre" />
    );
    expect(getByText('Cursos')).toBeTruthy();
    expect(getByText('Resultados del semestre')).toBeTruthy();
  });

  it('does not render a subtitle when not provided', () => {
    const { queryByText } = render(<SectionHeader title="Solo título" />);
    // Title is there
    expect(queryByText('Solo título')).toBeTruthy();
    // No second text node containing specific subtitle content
    expect(queryByText('subtitle')).toBeNull();
  });

  it('matches the snapshot without subtitle', () => {
    const { toJSON } = render(<SectionHeader title="Comentarios" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches the snapshot with subtitle', () => {
    const { toJSON } = render(<SectionHeader title="Evaluaciones" subtitle="3 pendientes" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
