import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SAMPLE_WORK } from './src/data/sampleWork';
import { loadWorksCatalog } from './src/data/worksCatalog';
import { CLASSICS } from './src/data/classics';
import { normalizeWorkTitle } from './src/data/corrections';
import { ClassicScreen } from './src/screens/ClassicScreen';
import { Classic } from './src/types';
import { MainTabBar, MainTab } from './src/components/MainTabBar';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { FocusReciteScreen } from './src/screens/FocusReciteScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { CompositionScreen } from './src/screens/CompositionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';
import { Work } from './src/types';
import { FavoriteLine } from './src/services/favorites';
import { loadImportedWorks } from './src/services/importedWorks';

type Screen = 'tabs' | 'reader' | 'classic' | 'focus';


export default function App() {
  const [screen, setScreen] = useState<Screen>('tabs');
  const [tab, setTab] = useState<MainTab>('today');
  const [work, setWork] = useState<Work>(SAMPLE_WORK);
  const [readerLineIndex, setReaderLineIndex] = useState(0);
  const [readerReturnTab, setReaderReturnTab] = useState<MainTab>('today');
  const [classic, setClassic] = useState<Classic | null>(null);
  const [classicSectionIndex, setClassicSectionIndex] = useState<number | undefined>();
  const [classicSegmentIndex, setClassicSegmentIndex] = useState<number | undefined>();
  const [classicFromSearch, setClassicFromSearch] = useState(false);
  const [focusWorks, setFocusWorks] = useState<Work[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusRevision, setFocusRevision] = useState(0);

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
      if (screen === 'focus') {
        setScreen('tabs');
        setTab('today');
        setFocusRevision((value) => value + 1);
        return true;
      }
      if (screen === 'classic') {
        if (classicFromSearch) {
          setScreen('tabs');
          return true;
        }
        if (classicSectionIndex !== undefined) {
          setClassicSectionIndex(undefined);
          setClassicSegmentIndex(undefined);
          return true;
        }
        if (classic) {
          setClassic(null);
          return true;
        }
        setScreen('tabs');
        return true;
      }
      if (screen === 'reader') {
        setTab(readerReturnTab);
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
  }, [classic, classicFromSearch, classicSectionIndex, readerReturnTab, screen, tab]);

  const openWork = (next: Work, lineIndex = 0) => {
    setReaderReturnTab(tab);
    setWork(next);
    setReaderLineIndex(lineIndex);
    setScreen('reader');
  };

  const openFocus = (nextWorks: Work[], initialIndex = 0) => {
    const unique = [...new Map(nextWorks.map((item) => [item.id, item])).values()];
    if (!unique.length) return;
    setFocusWorks(unique);
    setFocusIndex(Math.max(0, Math.min(initialIndex, unique.length - 1)));
    setScreen('focus');
  };

  const closeFocus = () => {
    setScreen('tabs');
    setTab('today');
    setFocusRevision((value) => value + 1);
  };

  const openClassic = (next: Classic, sectionIndex?: number, segmentIndex?: number, fromSearch = false) => {
    setClassic(next);
    setClassicSectionIndex(sectionIndex);
    setClassicSegmentIndex(segmentIndex);
    setClassicFromSearch(fromSearch);
    setScreen('classic');
  };

  const openFavorite = async (favorite: FavoriteLine) => {
    if (favorite.workId.startsWith('classic-')) {
      const suffix = favorite.workId.slice('classic-'.length);
      const separator = suffix.lastIndexOf('-');
      const classicId = separator > 0 ? suffix.slice(0, separator) : '';
      const sectionIndex = separator > 0 ? Number(suffix.slice(separator + 1)) : Number.NaN;
      const target = CLASSICS.find((item) => item.id === classicId);
      if (target && Number.isInteger(sectionIndex) && sectionIndex >= 0) {
        openClassic(target, sectionIndex, favorite.lineIndex, true);
        return;
      }
    }
    const imported = await loadImportedWorks();
    const catalog = await loadWorksCatalog();
    const targetTitle = normalizeWorkTitle(favorite.workTitle);
    const target = catalog.find((item) => item.id === favorite.workId)
      ?? imported.find((item) => item.id === favorite.workId)
      ?? catalog.find((item) => normalizeWorkTitle(item.title) === targetTitle)
      ?? imported.find((item) => normalizeWorkTitle(item.title) === targetTitle);
    if (target) openWork(target, favorite.lineIndex);
  };

  const closeReader = () => {
    setTab(readerReturnTab);
    setScreen('tabs');
  };

  const closeClassic = () => {
    if (classicFromSearch) {
      setScreen('tabs');
      return;
    }
    if (classicSectionIndex !== undefined) {
      setClassicSectionIndex(undefined);
      setClassicSegmentIndex(undefined);
      return;
    }
    setScreen('tabs');
  };

  const openSettings = () => {
    setScreen('tabs');
    setTab('profile');
    setFocusRevision((value) => value + 1);
  };

  return (
    <SafeAreaProvider>
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.tabs}>
        <View style={styles.content}>
          <View style={[styles.tabPane, tab !== 'today' && styles.hidden]}>
            <TodayScreen
              onOpenWork={openWork}
              onOpenFocus={openFocus}
              onOpenSettings={openSettings}
              refreshToken={focusRevision}
            />
          </View>
          <View style={[styles.tabPane, tab !== 'library' && styles.hidden]}>
            <LibraryScreen onOpenWork={openWork} onOpenClassic={openClassic} onOpenSettings={openSettings} />
          </View>
          <View style={[styles.tabPane, tab !== 'compose' && styles.hidden]}>
            <CompositionScreen onBack={() => setTab('today')} onOpenSettings={openSettings} />
          </View>
          <View style={[styles.tabPane, tab !== 'profile' && styles.hidden]}>
            <ProfileScreen
              active={tab === 'profile'}
              refreshToken={screen === 'tabs' && tab === 'profile' ? 1 : 0}
              onOpenFavorite={(item) => { void openFavorite(item); }}
              onOpenWork={openWork}
            />
          </View>
        </View>
        {screen === 'tabs' ? <MainTabBar active={tab} onChange={setTab} /> : null}
      </View>
      {screen === 'reader' ? (
        <View style={styles.readerOverlay}>
          <ReaderScreen
            work={work}
            initialLineIndex={readerLineIndex}
            onBack={closeReader}
            onOpenSettings={openSettings}
          />
        </View>
      ) : null}
      {screen === 'focus' ? (
        <View style={styles.focusOverlay}>
          <FocusReciteScreen
            works={focusWorks}
            initialIndex={focusIndex}
            onBack={closeFocus}
            onOpenSettings={openSettings}
          />
        </View>
      ) : null}
      {screen === 'classic' ? (
        <View style={styles.readerOverlay}>
          <ClassicScreen
            classic={classic}
            sectionIndex={classicSectionIndex}
            initialSegmentIndex={classicSegmentIndex}
            onClassicChange={setClassic}
            onSectionChange={(index) => { setClassicSectionIndex(index); setClassicSegmentIndex(undefined); }}
            onBack={closeClassic}
          />
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
  focusOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 400, elevation: 80, backgroundColor: colors.paper },
  readerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 40, backgroundColor: colors.paper },
});
