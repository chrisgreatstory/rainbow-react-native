import { useCallback, useEffect, useState } from 'react';
import { Clipboard } from 'react-native';
import useAppState from './useAppState';

export default function useClipBoard() {
  const appState = useAppState();
  const [data, updateClipboardData] = useState('');

  async function updateClipboard() {
    const content = await Clipboard.getString();
    updateClipboardData(content);
  }

  useEffect(() => {
    if (appState === 'active') {
      updateClipboard();
    }
  }, [appState]);

  const setString = useCallback(content => {
    Clipboard.setString(content);
    updateClipboardData(content);
  }, []);

  return [data, setString];
}
