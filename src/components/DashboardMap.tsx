import React from 'react';
import { Platform } from 'react-native';
import DashboardMapWeb from './DashboardMap.web';
import DashboardMapNative from './DashboardMap.native';
import { Event } from '../types';

interface DashboardMapProps {
  events: Event[];
  focusedEventId?: string | null;
  onSelectEvent?: (event: Event) => void;
  onClose?: () => void;
}

export default function DashboardMap(props: DashboardMapProps) {
  if (Platform.OS === 'web') {
    return <DashboardMapWeb {...props} />;
  }
  return <DashboardMapNative {...props} />;
}
