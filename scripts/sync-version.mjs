import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const packagePath = path.join(root, 'package.json');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const packageJson = readJson(packagePath);
const requestedVersion = process.argv[2] ?? packageJson.version;
const requestedVersionCode = process.argv[3];

if (!/^\d+\.\d+\.\d+$/.test(requestedVersion)) {
  throw new Error(`版本号必须是三段数字，例如 3.1.0；收到：${requestedVersion}`);
}
if (requestedVersionCode !== undefined && !/^\d+$/.test(requestedVersionCode)) {
  throw new Error(`versionCode 必须是整数；收到：${requestedVersionCode}`);
}

function writeJson(relativePath, value) {
  const target = path.join(root, relativePath);
  const previousText = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const bom = previousText.charCodeAt(0) === 0xFEFF;
  const eol = previousText.includes('\r\n') ? '\r\n' : '\n';
  const text = `${JSON.stringify(value, null, 2)}\n`.replace(/\n/g, eol);
  fs.writeFileSync(target, `${bom ? '\uFEFF' : ''}${text}`, 'utf8');
}

packageJson.version = requestedVersion;
writeJson('package.json', packageJson);

const lockPath = path.join(root, 'package-lock.json');
const lock = readJson(lockPath);
lock.version = requestedVersion;
if (lock.packages?.['']) lock.packages[''].version = requestedVersion;
writeJson('package-lock.json', lock);

const appJsonPath = path.join(root, 'app.json');
const appJson = readJson(appJsonPath);
appJson.expo.version = requestedVersion;
if (requestedVersionCode !== undefined) appJson.expo.android.versionCode = Number(requestedVersionCode);
writeJson('app.json', appJson);

const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${appJson.expo.android.versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${requestedVersion}"`);
fs.writeFileSync(gradlePath, gradle, 'utf8');

const versionJsonPath = path.join(root, 'version.json');
const previous = fs.existsSync(versionJsonPath)
  ? readJson(versionJsonPath)
  : {};
const sameVersion = previous.version === requestedVersion;
const baseUrl = `https://github.com/c6823821-sketch/shici-recite-app/releases/download/v${requestedVersion}/shici-recite-app-v${requestedVersion}.apk`;
writeJson('version.json', {
  version: requestedVersion,
  downloadUrl: baseUrl,
  downloadUrls: [
    `https://ghproxy.net/${baseUrl}`,
    `https://gh-proxy.com/${baseUrl}`,
    `https://ghfast.top/${baseUrl}`,
    baseUrl,
  ],
  size: sameVersion ? (previous.size ?? 0) : 0,
  releaseUrl: `https://github.com/c6823821-sketch/shici-recite-app/releases/tag/v${requestedVersion}`,
  notes: sameVersion ? (previous.notes ?? '') : '',
});

console.log(`已同步版本 ${requestedVersion}，versionCode ${appJson.expo.android.versionCode}`);
