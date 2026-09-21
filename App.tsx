import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { WORKS } from './src/data/works';
import { MainTabBar, MainTab } from './src/components/MainTabBar';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { CompositionScreen } from './src/screens/CompositionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';
import { Work } from './src/types';

type Screen = 'tabs' | 'reader';


export default function App() {
  const [screen, setScreen] = useState<Screen>('tabs');
  const [tab, setTab] = useState<MainTab>('today');
  const [work, setWork] = useState<Work>(WORKS[0]);
  const [readerLineIndex, setReaderLineIndex] = useState(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'reader') {
        setScreen('tabs');
        return true;
      }
      if (tab !== 'today') {
        setTab('today');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, tab]);

  const openWork = (next: Work, lineIndex = 0) => {
    setWork(next);
    setReaderLineIndex(lineIndex);
    setScreen('reader');
  };

  const openSettings = () => {
    setScreen('tabs');
    setTab('profile');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {screen === 'reader' ? (
        <ReaderScreen
          work={work}
          initialLineIndex={readerLineIndex}
          onBack={() => setScreen('tabs')}
          onOpenSettings={openSettings}
        />
      ) : (
        <View style={styles.tabs}>
          <View style={styles.content}>
            {tab === 'today' ? (
              <TodayScreen
                onOpenWork={openWork}
                onOpenSettings={openSettings}
                onOpenLibrary={() => setTab('library')}
                onOpenComposition={() => setTab('compose')}
              />
            ) : tab === 'library' ? (
              <LibraryScreen onOpenWork={openWork} />
            ) : tab === 'compose' ? (
              <CompositionScreen onBack={() => setTab('today')} onOpenSettings={openSettings} />
            ) : (
              <SettingsScreen onBack={() => setTab('today')} />
            )}
          </View>
          <MainTabBar active={tab} onChange={setTab} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  tabs: { flex: 1 },
  content: { flex: 1 },
});

