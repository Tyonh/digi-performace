const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// react-native-svg no web precisa do bundle específico para browser.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-svg') {
    return context.resolveRequest(context, 'react-native-svg/src/ReactNativeSVG.web', platform)
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
