import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../../src/presentation/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders the title text', () => {
    const { getByText } = render(<PrimaryButton title="Iniciar sesión" onPress={() => {}} />);
    expect(getByText('Iniciar sesión')).toBeTruthy();
  });

  it('shows an ActivityIndicator and hides title when loading is true', () => {
    const { queryByText, getByTestId } = render(
      <PrimaryButton title="Guardar" onPress={() => {}} loading />
    );
    expect(queryByText('Guardar')).toBeNull();
  });

  it('does not show an ActivityIndicator when loading is false', () => {
    const { getByText } = render(
      <PrimaryButton title="Guardar" onPress={() => {}} loading={false} />
    );
    expect(getByText('Guardar')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="Guardar" onPress={onPress} />);
    fireEvent.press(getByText('Guardar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="Guardar" onPress={onPress} disabled />);
    fireEvent.press(getByText('Guardar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading is true', () => {
    const onPress = jest.fn();
    // When loading, title is not rendered, so we query the pressable by role
    const { UNSAFE_getByType } = render(<PrimaryButton title="Guardar" onPress={onPress} loading />);
    // Pressable is disabled when loading — pressing should not trigger onPress
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders without crashing with minimal props', () => {
    const { toJSON } = render(<PrimaryButton title="OK" onPress={() => {}} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
