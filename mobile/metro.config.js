const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

const escapeRegExp = (str) => str.replace(/[-[/\]{}()*+?.,\\^$|#\s]/g, '\\$&');

config.resolver.blockList = [
  new RegExp(escapeRegExp(path.resolve(workspaceRoot, 'server')) + '.*'),
];

config.resolver.extraNodeModules = {
  '@shared/src': path.resolve(workspaceRoot, 'shared/src'),
};

config.watcher = {
  ...config.watcher,
  additionalExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'css'],
};

module.exports = withNativeWind(config, { input: './src/global.css' });
