// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

/**
 * This widget is from <https://github.com/jamesramsay/weatherline>
 * By James Ramsay.
 * Based on code by:
 * Linus Mimietz <https://github.com/linusmimietz/Scriptable-Auto-Update>
 * Giulio Magnifico <https://gist.github.com/giuliomagnifico/efd3ecd628a96d714e840c98ac77463f>
 */

/**
 * Roadmap:
 * - track branch
 * - track semver range
 * - development mode - disable cache
 */

const useCache = false;
const scriptName = 'WeatherLine';
const scriptUrl = 'https://raw.githubusercontent.com/jamesramsay/scriptable-weather-line/develop/weatherline.js';

let modulePath = await downloadModule(scriptName, scriptUrl); // jshint ignore:line
if (modulePath != null) {
  let importedModule = importModule(modulePath);
  await importedModule.main(); // jshint ignore:line
} else {
  console.log('Failed to download new module and could not find any local version.');
}

async function downloadModule(scriptName, scriptUrl) {
  // returns path of latest module version which is accessible
  let fm = FileManager.local();
  let scriptPath = module.filename;
  let moduleDir = scriptPath.replace(fm.fileName(scriptPath, true), scriptName);
  if (fm.fileExists(moduleDir) && !fm.isDirectory(moduleDir)) fm.remove(moduleDir);
  if (!fm.fileExists(moduleDir)) fm.createDirectory(moduleDir);
  let dayNumber = Math.floor(Date.now() / 1000 / 60 / 60 / 24);
  let moduleFilename = dayNumber.toString() + '.js';
  let modulePath = fm.joinPath(moduleDir, moduleFilename);

  // Ignore cache when in development environment
  if (useCache && fm.fileExists(modulePath)) {
    console.log('Module already downlaoded ' + moduleFilename);
    return modulePath;
  } else {
    let [moduleFiles, moduleLatestFile] = getModuleVersions(scriptName);
    console.log('Downloading ' + moduleFilename + ' from URL: ' + scriptUrl);
    let req = new Request(scriptUrl);
    let moduleJs = await req.load().catch(() => {
      return null;
    });
    if (moduleJs) {
      fm.write(modulePath, moduleJs);
      if (moduleFiles != null) {
        moduleFiles
          .filter(x => modulePath.endsWith(x) == false)
          .map(x => fm.remove(fm.joinPath(moduleDir, x)));
      }
      return modulePath;
    } else {
      console.log('Failed to download new module. Using latest local version: ' + moduleLatestFile);
      return (moduleLatestFile != null) ? fm.joinPath(moduleDir, moduleLatestFile) : null;
    }
  }
}

function getModuleVersions(scriptName) {
  // returns all saved module versions and latest version of them
  let fm = FileManager.local();
  let scriptPath = module.filename;
  let moduleDir = scriptPath.replace(fm.fileName(scriptPath, true), scriptName);
  let dirContents = fm.listContents(moduleDir);
  if (dirContents.length > 0) {
    let versions = dirContents.map(x => {
      if (x.endsWith('.js')) return parseInt(x.replace('.js', ''));
    });
    versions.sort(function(a, b) {
      return b - a;
    });
    versions = versions.filter(Boolean);
    if (versions.length > 0) {
      let moduleFiles = versions.map(x => {
        return x + '.js';
      });
      return [moduleFiles, moduleFiles[0]];
    }
  }
  return [null, null];
}

