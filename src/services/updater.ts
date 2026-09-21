import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const OWNER = 'c6823821-sketch';
const REPO = 'shici-recite-app';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const APK_PREFIX = 'shici-recite-app-';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  size: number;
  releaseUrl: string;
  notes: string;
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

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const response = await fetch(API_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'shici-recite-app' },
  });
  if (!response.ok) throw new Error(`检查更新失败（${response.status}）`);
  const data = (await response.json()) as {
    tag_name?: string;
    html_url?: string;
    body?: string;
    assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
  };
  const latestVersion = (data.tag_name ?? '').replace(/^v/i, '');
  const currentVersion = Application.nativeApplicationVersion ?? '0.0.0';
  if (!latestVersion || !isNewer(latestVersion, currentVersion)) return null;
  const apk = data.assets?.find((asset) => asset.name?.endsWith('.apk'));
  if (!apk?.browser_download_url) throw new Error('新版没有找到 APK 安装包。');
  return {
    version: latestVersion,
    downloadUrl: apk.browser_download_url,
    size: apk.size ?? 0,
    releaseUrl: data.html_url ?? '',
    notes: data.body ?? '',
  };
}

export async function downloadAndInstallUpdate(
  update: UpdateInfo,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('应用内安装只支持 Android。');
  if (!FileSystem.cacheDirectory) throw new Error('手机缓存目录不可用。');
  const target = `${FileSystem.cacheDirectory}${APK_PREFIX}${update.version}.apk`;
  let file = await FileSystem.getInfoAsync(target);
  if (!file.exists || (file.size ?? 0) < update.size * 0.98) {
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
    if (!result?.uri) throw new Error('APK 下载失败。');
    file = await FileSystem.getInfoAsync(result.uri);
    if (!file.exists) throw new Error('APK 下载完成后文件不存在。');
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
  if (!bytes) return '未知大小';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

