import '@testing-library/jest-native/extend-expect';

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BlurView: ({ children }: { children?: unknown }) => React.createElement(View, null, children),
  };
});
