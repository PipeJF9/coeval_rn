import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppTextInput } from '../../src/presentation/components/AppTextInput';

describe('AppTextInput', () => {
  it('renders the label text', () => {
    const { getByText } = render(
      <AppTextInput label="Correo electrónico" value="" onChangeText={() => {}} />
    );
    expect(getByText('Correo electrónico')).toBeTruthy();
  });

  it('renders the placeholder when value is empty', () => {
    const { getByPlaceholderText } = render(
      <AppTextInput label="Email" placeholder="email@example.com" value="" onChangeText={() => {}} />
    );
    expect(getByPlaceholderText('email@example.com')).toBeTruthy();
  });

  it('shows an error message when the error prop is provided', () => {
    const { getByText } = render(
      <AppTextInput label="Email" error="Este campo es requerido" value="" onChangeText={() => {}} />
    );
    expect(getByText('Este campo es requerido')).toBeTruthy();
  });

  it('does not render an error message when error is not provided', () => {
    const { queryByText } = render(
      <AppTextInput label="Email" value="" onChangeText={() => {}} />
    );
    expect(queryByText(/requerido/i)).toBeNull();
  });

  it('does not render an error message when error is null', () => {
    const { queryByText } = render(
      <AppTextInput label="Email" error={null} value="" onChangeText={() => {}} />
    );
    expect(queryByText(/error/i)).toBeNull();
  });

  it('calls onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <AppTextInput label="Email" placeholder="email" value="" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('email'), 'new@example.com');
    expect(onChangeText).toHaveBeenCalledWith('new@example.com');
  });

  it('renders a rightElement when provided', () => {
    const { getByTestId } = render(
      <AppTextInput
        label="Password"
        value=""
        onChangeText={() => {}}
        rightElement={<></>}
        testID="input-root"
      />
    );
    // The component renders without crashing when rightElement is given
    expect(getByTestId('input-root')).toBeTruthy();
  });

  it('renders an empty label when label is an empty string', () => {
    // Should not throw
    const { toJSON } = render(<AppTextInput label="" value="" onChangeText={() => {}} />);
    expect(toJSON()).toBeTruthy();
  });
});
