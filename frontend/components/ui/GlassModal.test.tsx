import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import GlassModal from './GlassModal';

describe('GlassModal', () => {
  it('renders title and content when visible', () => {
    const { getByText } = render(
      <GlassModal visible onClose={jest.fn()} title="Details">
        <Text>Modal body</Text>
      </GlassModal>
    );

    expect(getByText('Details')).toBeTruthy();
    expect(getByText('Modal body')).toBeTruthy();
  });

  it('calls onClose from close controls', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <GlassModal visible onClose={onClose} title="Details">
        <Text>Modal body</Text>
      </GlassModal>
    );

    fireEvent.press(getAllByLabelText('Close modal')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
