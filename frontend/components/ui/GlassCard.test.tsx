import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import GlassCard from './GlassCard';

describe('GlassCard', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <GlassCard>
        <Text>Inside card</Text>
      </GlassCard>
    );

    expect(getByText('Inside card')).toBeTruthy();
  });

  it('supports press handling when onPress is provided', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <GlassCard onPress={onPress} accessibilityLabel="Open card">
        <Text>Content</Text>
      </GlassCard>
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
