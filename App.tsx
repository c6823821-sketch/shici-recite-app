import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { WORKS } from './src/data/works';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { CompositionScreen } from './src/screens/CompositionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';
import { Work } from './src/types';

type Screen = 'home' | 'reader' | 'settings' | 'compose';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [work, setWork] = useState<Work>(WORKS[0]);
  const [readerLineIndex, setReaderLineIndex] = useState(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      setScreen('home');
      return true;
    });
    return () => subscription.remove();
  }, [screen]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {screen === 'home' ? (
        <HomeScreen
          onOpenWork={(next, lineIndex = 0) => {
            setWork(next);
            setReaderLineIndex(lineIndex);
            setScreen('reader');
          }}
          onOpenSettings={() => setScreen('settings')}
          onOpenComposition={() => setScreen('compose')}
        />
      ) : screen === 'reader' ? (
        <ReaderScreen
          work={work}
          initialLineIndex={readerLineIndex}
          onBack={() => setScreen('home')}
          onOpenSettings={() => setScreen('settings')}
        />
      ) : screen === 'compose' ? (
        <CompositionScreen
          onBack={() => setScreen('home')}
          onOpenSettings={() => setScreen('settings')}
        />
      ) : (
        <SettingsScreen onBack={() => setScreen('home')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});

