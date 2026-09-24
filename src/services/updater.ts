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
}

interface Manifest {
  version?: string;
  downloadUrl?: string;
  size?: number;
  releaseUrl?: string;
  notes?: string;
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
  if (Platform.OS !== 'android') throw new Error('\u5e94\u7528\u5185\u5b89\u88c5\u53ea\u652f\u6301 Android\u3002');
  if (!FileSystem.cacheDirectory) throw new Error('\u624b\u673a\u7f13\u5b58\u76ee\u5f55\u4e0d\u53ef\u7528\u3002');
  const target = `${FileSystem.cacheDirectory}${APK_PREFIX}${update.version}.apk`;
  let file = await FileSystem.getInfoAsync(target);
  const fileSize = 'size' in file ? (file.size ?? 0) : 0;
  const incomplete = update.size > 0 && fileSize < update.size * 0.98;
  if (!file.exists || incomplete) {
    if (file.exists) await FileSystem.deleteAsync(target, { idempotent: true });
    const task = FileSystem.createDownloadResumable(
      update.downloadUrl,
      target,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
        }
      },
    );
    const result = await task.downloadAsync();
    if (!result?.uri) throw new Error('APK \u4e0b\u8f7d\u5931\u8d25\u3002');
    file = await FileSystem.getInfoAsync(result.uri);
    if (!file.exists) throw new Error('APK \u4e0b\u8f7d\u5b8c\u6210\u540e\u6587\u4ef6\u4e0d\u5b58\u5728\u3002');
    await openInstaller(result.uri);
    return;
  }
  await openInstaller(target);
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
