import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlassButton from './GlassButton';

describe('GlassButton', () => {
  it('renders title and calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = render(<GlassButton title="Join" onPress={onPress} />);

    expect(getByText('Join')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables interaction when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<GlassButton title="Join" onPress={onPress} disabled />);

    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
