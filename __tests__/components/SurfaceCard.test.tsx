import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SurfaceCard } from '../../src/presentation/components/SurfaceCard';

describe('SurfaceCard', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <SurfaceCard>
        <Text>Contenido de la tarjeta</Text>
      </SurfaceCard>
    );
    expect(getByText('Contenido de la tarjeta')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <SurfaceCard>
        <Text>Título</Text>
        <Text>Subtítulo</Text>
      </SurfaceCard>
    );
    expect(getByText('Título')).toBeTruthy();
    expect(getByText('Subtítulo')).toBeTruthy();
  });

  it('matches the snapshot', () => {
    const { toJSON } = render(
      <SurfaceCard>
        <Text>Snap</Text>
      </SurfaceCard>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
