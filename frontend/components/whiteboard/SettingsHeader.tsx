import React from 'react';
import ScreenHeader from '../ui/ScreenHeader';

type SettingsHeaderProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};

export default function SettingsHeader({ title, subtitle, rightElement }: SettingsHeaderProps) {
  return <ScreenHeader title={title} subtitle={subtitle} rightElement={rightElement} />;
}
