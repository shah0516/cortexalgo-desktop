// AfterSign hook for electron-builder
// Ad-hoc signs the app bundle for beta releases (no Apple Developer cert needed)

const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const appPath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app';

  console.log('Ad-hoc signing:', appPath);

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log('Ad-hoc signing completed');
  } catch (error) {
    console.error('Ad-hoc signing failed:', error.message);
    // Don't fail the build, just warn
  }
};
