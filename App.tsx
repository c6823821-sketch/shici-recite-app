import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackHandler, StyleSheet, View } from 'react-native';
import { WORKS } from './src/data/works';
import { ClassicScreen } from './src/screens/ClassicScreen';
import { Classic } from './src/types';
import { MainTabBar, MainTab } from './src/components/MainTabBar';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { CompositionScreen } from './src/screens/CompositionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';
import { Work } from './src/types';

type Screen = 'tabs' | 'reader' | 'classic';


export default function App() {
  const [screen, setScreen] = useState<Screen>('tabs');
  const [tab, setTab] = useState<MainTab>('today');
  const [work, setWork] = useState<Work>(WORKS[0]);
  const [readerLineIndex, setReaderLineIndex] = useState(0);
  const [classic, setClassic] = useState<Classic | null>(null);
  const [classicSectionIndex, setClassicSectionIndex] = useState<number | undefined>();

  useEffect(() => {
    if (Platform.OS === 'android') {
      const syncNavigationBar = (state: string) => {
        NavigationBar.setHidden(state === 'active');
      };
      syncNavigationBar(AppState.currentState);
      const navigationSubscription = AppState.addEventListener('change', syncNavigationBar);
      return () => navigationSubscription.remove();
    }
    return undefined;
  }, []);

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

  const openClassic = (next: Classic, sectionIndex?: number) => {
    setClassic(next);
    setClassicSectionIndex(sectionIndex);
    setScreen('classic');
  };

  const openSettings = () => {
    setScreen('tabs');
    setTab('profile');
  };

  return (
    <SafeAreaProvider>
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.tabs}>
        <View style={styles.content}>
          <View style={[styles.tabPane, tab !== 'today' && styles.hidden]}>
            <TodayScreen onOpenWork={openWork} onOpenSettings={openSettings} />
          </View>
          <View style={[styles.tabPane, tab !== 'library' && styles.hidden]}>
            <LibraryScreen onOpenWork={openWork} onOpenClassic={openClassic} onOpenSettings={openSettings} />
          </View>
          <View style={[styles.tabPane, tab !== 'compose' && styles.hidden]}>
            <CompositionScreen onBack={() => setTab('today')} onOpenSettings={openSettings} />
          </View>
          <View style={[styles.tabPane, tab !== 'profile' && styles.hidden]}>
            <ProfileScreen />
          </View>
        </View>
        <MainTabBar active={tab} onChange={setTab} />
      </View>
      {screen === 'reader' ? (
        <View style={styles.readerOverlay}>
          <ReaderScreen
            work={work}
            initialLineIndex={readerLineIndex}
            onBack={() => setScreen('tabs')}
            onOpenSettings={openSettings}
          />
        </View>
      ) : null}
      {screen === 'classic' ? (
        <View style={styles.readerOverlay}>
          <ClassicScreen initialClassic={classic} initialSectionIndex={classicSectionIndex} onBack={() => setScreen('tabs')} />
        </View>
      ) : null}
    </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  tabs: { flex: 1 },
  content: { flex: 1 },
  tabPane: { flex: 1 },
  hidden: { display: 'none' },
  readerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 40, backgroundColor: colors.paper },
});



