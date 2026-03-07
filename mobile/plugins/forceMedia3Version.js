const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function forceMedia3Version(config) {
  return withAppBuildGradle(config, (config) => {
    const resolutionStrategy = `
configurations.all {
    resolutionStrategy {
        force 'androidx.media3:media3-exoplayer:1.4.1'
        force 'androidx.media3:media3-ui:1.4.1'
        force 'androidx.media3:media3-common:1.4.1'
        force 'androidx.media3:media3-datasource:1.4.1'
        force 'androidx.media3:media3-datasource-okhttp:1.4.1'
        force 'androidx.media3:media3-decoder:1.4.1'
        force 'androidx.media3:media3-extractor:1.4.1'
        force 'androidx.media3:media3-container:1.4.1'
        force 'androidx.media3:media3-database:1.4.1'
        force 'androidx.media3:media3-session:1.4.1'
        force 'androidx.media3:media3-exoplayer-dash:1.4.1'
        force 'androidx.media3:media3-exoplayer-hls:1.4.1'
        force 'androidx.media3:media3-exoplayer-smoothstreaming:1.4.1'
    }
}

`;

    if (!config.modResults.contents.includes("resolutionStrategy {")) {
      config.modResults.contents = resolutionStrategy + config.modResults.contents;
    }

    return config;
  });
};
