import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import GlassInput from './GlassInput';

describe('GlassInput', () => {
  it('renders label and error text', () => {
    const { getByText } = render(
      <GlassInput
        label="Email"
        value="test@ilstu.edu"
        onChangeText={jest.fn()}
        error="Invalid email"
      />
    );

    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <GlassInput value="hello" onChangeText={onChangeText} placeholder="Type here" />
    );

    fireEvent.changeText(getByDisplayValue('hello'), 'updated');
    expect(onChangeText).toHaveBeenCalledWith('updated');
  });
});
