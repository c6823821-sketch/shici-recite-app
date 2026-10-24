import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { ReciteScreen } from './src/screens/ReciteScreen';
import { FocusReciteScreen } from './src/screens/FocusReciteScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { CompositionScreen } from './src/screens/CompositionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';
import { Work } from './src/types';
import { FavoriteLine } from './src/services/favorites';
import { loadImportedWorks } from './src/services/importedWorks';
import { AppearanceProvider, useAppearance } from './src/services/appearance';

type Screen = 'tabs' | 'reader' | 'classic' | 'focus';

const MemoTodayScreen = React.memo(TodayScreen);
const MemoLibraryScreen = React.memo(LibraryScreen);
const MemoReciteScreen = React.memo(ReciteScreen);
const MemoCompositionScreen = React.memo(CompositionScreen);
const MemoProfileScreen = React.memo(ProfileScreen);

export default function App() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <AppShell />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { background } = useAppearance();
  const [screen, setScreen] = useState<Screen>('tabs');
  const [tab, setTab] = useState<MainTab>('today');
  const [visitedTabs, setVisitedTabs] = useState<MainTab[]>(['today']);
  const tabRef = useRef<MainTab>('today');
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
  const [settingsRevision, setSettingsRevision] = useState(0);

  const changeTab = useCallback((next: MainTab) => {
    tabRef.current = next;
    setTab(next);
    setVisitedTabs((current) => current.includes(next) ? current : [...current, next]);
  }, []);

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
        changeTab('recite');
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
        changeTab(readerReturnTab);
        setScreen('tabs');
        return true;
      }
      if (tab !== 'today') {
        changeTab('today');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [changeTab, classic, classicFromSearch, classicSectionIndex, readerReturnTab, screen, tab]);

  const openWork = useCallback((next: Work, lineIndex = 0) => {
    setReaderReturnTab(tabRef.current);
    setWork(next);
    setReaderLineIndex(lineIndex);
    setScreen('reader');
  }, []);

  const openFocus = useCallback((nextWorks: Work[], initialIndex = 0) => {
    const unique = [...new Map(nextWorks.map((item) => [item.id, item])).values()];
    if (!unique.length) return;
    setFocusWorks(unique);
    setFocusIndex(Math.max(0, Math.min(initialIndex, unique.length - 1)));
    setScreen('focus');
  }, []);

  const closeFocus = useCallback(() => {
    setScreen('tabs');
    changeTab('recite');
    setFocusRevision((value) => value + 1);
  }, [changeTab]);

  const openClassic = useCallback((next: Classic, sectionIndex?: number, segmentIndex?: number, fromSearch = false) => {
    setClassic(next);
    setClassicSectionIndex(sectionIndex);
    setClassicSegmentIndex(segmentIndex);
    setClassicFromSearch(fromSearch);
    setScreen('classic');
  }, []);

  const openFavorite = useCallback(async (favorite: FavoriteLine) => {
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
  }, [openClassic, openWork]);

  const closeReader = useCallback(() => {
    changeTab(readerReturnTab);
    setScreen('tabs');
  }, [changeTab, readerReturnTab]);

  const closeClassic = useCallback(() => {
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
  }, [classicFromSearch, classicSectionIndex]);

  const openSettings = useCallback(() => {
    setScreen('tabs');
    changeTab('profile');
    setFocusRevision((value) => value + 1);
  }, [changeTab]);

  const backToToday = useCallback(() => changeTab('today'), [changeTab]);
  const openFavoriteFromProfile = useCallback((item: FavoriteLine) => {
    void openFavorite(item);
  }, [openFavorite]);
  const settingsSaved = useCallback(() => {
    setSettingsRevision((value) => value + 1);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style="dark" />
      <View style={styles.tabs}>
        <View style={styles.content}>
          {visitedTabs.includes('today') ? <View style={[styles.tabPane, tab !== 'today' && styles.hidden]}>
            <MemoTodayScreen
              onOpenWork={openWork}
              onOpenSettings={openSettings}
              refreshToken={focusRevision}
              settingsRevision={settingsRevision}
            />
          </View> : null}
          {visitedTabs.includes('library') ? <View style={[styles.tabPane, tab !== 'library' && styles.hidden]}>
            <MemoLibraryScreen
              onOpenWork={openWork}
              onOpenClassic={openClassic}
              onOpenSettings={openSettings}
              settingsRevision={settingsRevision}
            />
          </View> : null}
          {visitedTabs.includes('recite') ? <View style={[styles.tabPane, tab !== 'recite' && styles.hidden]}>
            <MemoReciteScreen
              onOpenFocus={openFocus}
              refreshToken={focusRevision}
            />
          </View> : null}
          {visitedTabs.includes('compose') ? <View style={[styles.tabPane, tab !== 'compose' && styles.hidden]}>
            <MemoCompositionScreen
              onBack={backToToday}
              onOpenSettings={openSettings}
              settingsRevision={settingsRevision}
            />
          </View> : null}
          {visitedTabs.includes('profile') ? <View style={[styles.tabPane, tab !== 'profile' && styles.hidden]}>
            <MemoProfileScreen
              active={tab === 'profile'}
              refreshToken={0}
              onOpenFavorite={openFavoriteFromProfile}
              onOpenWork={openWork}
              onSettingsSaved={settingsSaved}
            />
          </View> : null}
        </View>
        {screen === 'tabs' ? <MainTabBar active={tab} onChange={changeTab} /> : null}
      </View>
      {screen === 'reader' ? (
        <View style={[styles.readerOverlay, { backgroundColor: background }]}>
          <ReaderScreen
            work={work}
            initialLineIndex={readerLineIndex}
            onBack={closeReader}
            onOpenSettings={openSettings}
            onWorkUpdated={setWork}
          />
        </View>
      ) : null}
      {screen === 'focus' ? (
        <View style={[styles.focusOverlay, { backgroundColor: background }]}>
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  tabs: { flex: 1 },
  content: { flex: 1 },
  tabPane: { flex: 1 },
  hidden: { display: 'none' },
  focusOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 400, elevation: 80 },
  readerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 40, backgroundColor: colors.paper },
});
