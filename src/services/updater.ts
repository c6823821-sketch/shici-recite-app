import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const OWNER = 'c6823821-sketch';
const REPO = 'shici-recite-app';
const MANIFEST_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/version.json`;
const LATEST_PAGE = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const APK_PREFIX = 'shici-recite-app-';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  size: number;
  releaseUrl: string;
  notes: string;
  downloadUrls?: string[];
}

interface Manifest {
  version?: string;
  downloadUrl?: string;
  size?: number;
  releaseUrl?: string;
  notes?: string;
  downloadUrls?: string[];
}

function normalizeVersion(value: string): number[] {
  return value.replace(/^v/i, '').split('.').map((part) => Number(part.replace(/\D.*$/, '')) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const left = normalizeVersion(latest);
  const right = normalizeVersion(current);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if ((left[index] ?? 0) > (right[index] ?? 0)) return true;
    if ((left[index] ?? 0) < (right[index] ?? 0)) return false;
  }
  return false;
}

async function fetchManifest(): Promise<UpdateInfo | null> {
  const response = await fetch(MANIFEST_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'shici-recite-app' },
  });
  if (!response.ok) throw new Error(`?????????${response.status}?`);
  const data = (await response.json()) as Manifest;
  const version = (data.version ?? '').replace(/^v/i, '');
  if (!version) throw new Error('??????????');
  return {
    version,
    downloadUrl: data.downloadUrl ?? `https://github.com/${OWNER}/${REPO}/releases/download/v${version}/${APK_PREFIX}v${version}.apk`,
    size: typeof data.size === 'number' ? data.size : 0,
    releaseUrl: data.releaseUrl ?? `https://github.com/${OWNER}/${REPO}/releases/tag/v${version}`,
    notes: data.notes ?? '',
    downloadUrls: Array.isArray(data.downloadUrls) ? data.downloadUrls.filter((url): url is string => typeof url === 'string' && url.startsWith('http')) : undefined,
  };
}

async function fetchLatestPage(): Promise<UpdateInfo> {
  const response = await fetch(LATEST_PAGE, {
    headers: { 'User-Agent': 'shici-recite-app', Accept: 'text/html' },
  });
  if (!response.ok) throw new Error(`?????????${response.status}?`);
  const match = response.url.match(/\/releases\/tag\/v?([0-9]+(?:\.[0-9]+)*)/i);
  const version = match?.[1];
  if (!version) throw new Error('??? Releases ?????????');
  return {
    version,
    downloadUrl: `https://github.com/${OWNER}/${REPO}/releases/download/v${version}/${APK_PREFIX}v${version}.apk`,
    size: 0,
    releaseUrl: response.url,
    notes: '',
    downloadUrls: [`https://github.com/${OWNER}/${REPO}/releases/download/v${version}/${APK_PREFIX}v${version}.apk`],
  };
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const currentVersion = Application.nativeApplicationVersion ?? '0.0.0';
  let latest: UpdateInfo;
  try {
    const manifest = await fetchManifest();
    if (!manifest) return null;
    latest = manifest;
  } catch {
    latest = await fetchLatestPage();
  }
  if (!isNewer(latest.version, currentVersion)) return null;
  if (!latest.downloadUrl) throw new Error('\u65b0\u7248\u6ca1\u6709\u627e\u5230 APK \u5b89\u88c5\u5305\u3002');
  return latest;
}

export async function downloadAndInstallUpdate(
  update: UpdateInfo,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('应用内安装只支持 Android。');
  if (!FileSystem.cacheDirectory) throw new Error('手机缓存目录不可用。');
  const urls = update.downloadUrls?.length ? update.downloadUrls : [update.downloadUrl];
  const target = `${FileSystem.cacheDirectory}${APK_PREFIX}${update.version}.apk`;
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      let file = await FileSystem.getInfoAsync(target);
      const currentSize = 'size' in file ? (file.size ?? 0) : 0;
      const existingComplete = file.exists && (update.size === 0 || currentSize === update.size);
      if (!existingComplete) {
        if (file.exists) await FileSystem.deleteAsync(target, { idempotent: true });
        const task = FileSystem.createDownloadResumable(
          url,
          target,
          {},
          (progress) => {
            if (progress.totalBytesExpectedToWrite > 0) {
              onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
            }
          },
        );
        const result = await task.downloadAsync();
        if (!result?.uri) throw new Error('APK 下载失败。');
        file = await FileSystem.getInfoAsync(result.uri);
      }
      const finalSize = 'size' in file ? (file.size ?? 0) : 0;
      if (!file.exists || (update.size > 0 && finalSize !== update.size)) {
        throw new Error(`APK 下载不完整（${finalSize}/${update.size || '?'}）。`);
      }
      await openInstaller(target);
      return;
    } catch (error) {
      lastError = error;
      const file = await FileSystem.getInfoAsync(target);
      if (file.exists) await FileSystem.deleteAsync(target, { idempotent: true });
    }
  }

  throw new Error(`所有下载线路都失败：${lastError instanceof Error ? lastError.message : '网络中断'}`);
}

async function openInstaller(fileUri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1 | 268435456,
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '\u672a\u77e5\u5927\u5c0f';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
