// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: sun;
"use strict";

/**
 * Scriptable Weather Line launcher
 * <https://github.com/jamesramsay/weatherline>
 *
 * Launcher automatically keeps the widget up to date with improvements.
 * Inspired by others, but avoids iCloud storage which may not be available
 * and can be unreliable - we don't need cross device sync.
 */

const DEV_ENV = true;
const trackingBranch = DEV_ENV ? 'develop' : 'main';
const scriptUrl = `https://raw.githubusercontent.com/jamesramsay/scriptable-weather-line/${trackingBranch}/weatherline.js`;

/**
 * Returns the JavaScript module from the URL
 *
 * @param {string} url - The url of the JavaScript module;
 * @returns {object} - The JavaScript module;
 */
async function requireFromURL(url) {
  let path = Cache.getPath(url);
  if (path == null) {
    const js = await (new Request(url)).load().catch(() => null);
    const str = js.toRawString();
    path = Cache.set(url, str, 60);
  }

  const module = importModule(path)
  if (Object.hasOwn(module, 'main') && (typeof module.main === 'function')) {
    console.log(`Running main() from ${url}`)
    await module.main()
  }
  return module;
}

/**
 * Cache
 *
 * Implementation of a simple cache using FileManager.cacheDirectory.
 *
 */
const secondsSinceEpoch = () => Math.round(Date.now() / 1000);
const Cache = {
  directory: 'weatherline',
  keyMatch: (f, key) => f.match(new RegExp(`^\\d+[.]${key}$`)),
  keyNotExpired: (f) => f.split('.', 1) > secondsSinceEpoch(),
  secondsInMinute: 60,
};

/**
 * Returns a cache hit if not expired.
 *
 * @param {string} key - The key of the cached item.
 * @returns {string} - The cached item.
 */
Cache.get = function (key) {
  const path = Cache.getPath(key);

  if (path == null) return;

  const fm = FileManager.local();
  return fm.readString(path);
}

Cache.getPath = function(key) {
  const hashedKey = Cache.hash(key);
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), Cache.directory);

  if (!fm.fileExists(cachePath)) return;

  const path = fm.listContents(cachePath)
    .filter(p => Cache.keyMatch(p, hashedKey) && Cache.keyNotExpired(p))
    .map(p => fm.joinPath(cachePath, p))
    .find(p => fm.fileExists(p));

  console.log(`Cache ${path != null ? 'hit' : 'miss'} - ${key}: ${path}`)
  return path
}

/**
 * Updates cache
 *
 * @param {string} key - The key of the item to be cached.
 * @param {string} str - The item to be cached.
 * @param {number} ttl - The number of seconds the cached data should be retained.
 * @returns {string} The file path of the cached item
 */
Cache.set = function(key, str, ttl = 60) {
  const hashedKey = Cache.hash(key);
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.cacheDirectory(), Cache.directory);

  if (!fm.fileExists(cachePath)) {
    fm.createDirectory(cachePath);
  }

  const staleFiles = fm.listContents(cachePath)
    .filter(f => Cache.keyMatch(f, hashedKey))
    .map(f => fm.joinPath(cachePath, f))

  const filename = `${secondsSinceEpoch() + ttl}.${hashedKey}`;
  const path = fm.joinPath(cachePath, filename);
  fm.writeString(path, str);

  // Remove stale files after updating the cache
  staleFiles.forEach((p) => fm.remove(p));

  return path;
}

/**
 * Returns a good enough hash for a string.
 * Based on: <https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js>
 *
 * @param {string} key - The string to hash
 * @param {number} [seed] - Optional seed
 * @returns {string} A good enough hash
 */
Cache.hash = function(key, seed = 0) {
  const A = 2654435761;
  const B = 1597334677;
  const C = 2246822507;
  const D = 3266489909;
  const E = 4294967296;
  const F = 2097151;

  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let index = 0, char; index < key.length; index++) {
    char = key.charCodeAt(index);

    h1 = Math.imul(h1 ^ char, A);
    h2 = Math.imul(h2 ^ char, B);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), C) ^ Math.imul(h2 ^ (h2 >>> 13), D);
  h2 = Math.imul(h2 ^ (h2 >>> 16), C) ^ Math.imul(h1 ^ (h1 >>> 13), D);

  return E * (F & h2) + (h1 >>> 0);
}

await requireFromURL(scriptUrl);
