module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.camdetect.app.NetworkScannerPackage;',
        packageInstance: 'new NetworkScannerPackage()',
      },
    },
  },
};
