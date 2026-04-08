const fs = require('node:fs');
const path = require('node:path');

function collectFilesRecursively(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectFilesRecursively(entryPath);
    }

    return [entryPath];
  });
}

describe('Expo Router app tree', () => {
  it('does not contain test files inside app/', () => {
    const appDirectoryPath = path.resolve(__dirname, '../../app');
    const appFilePaths = collectFilesRecursively(appDirectoryPath);
    const routeTestFiles = appFilePaths
      .map((filePath) => path.relative(appDirectoryPath, filePath))
      .filter((relativePath) => /\.(test|spec)\.[jt]sx?$/.test(relativePath));

    expect(routeTestFiles).toEqual([]);
  });
});
