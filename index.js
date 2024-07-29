const fetch = require('node-fetch');
const tar = require('tar');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

async function fetchPackageInfo(packageName) {
  const response = await fetch(`https://registry.npmjs.org/${packageName}`);
  return response.json();
}

async function downloadAndExtractPackage(packageName, version) {
  const tarballUrl = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
  const response = await fetch(tarballUrl);
  const extractStream = tar.extract();
  
  let files = [];
  extractStream.on('entry', (entry) => {
    if (entry.type === 'File') {
      files.push({ path: entry.path, content: '' });
    }
    entry.on('data', (chunk) => {
      if (entry.type === 'File') {
        files[files.length - 1].content += chunk.toString('utf8');
      }
    });
  });

  await pipeline(response.body, extractStream);
  return files;
}

function removeComments(content) {
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  content = content.replace(/\/\/.*$/gm, '');
  return content;
}

function calculateNonCommentSize(content) {
  const contentWithoutComments = removeComments(content);
  return Buffer.from(contentWithoutComments).length;
}

function countImports(content) {
  const importRegex = /import\s+.+\s+from\s+['"].*['"];?|require\(['"].*['"]\)/g;
  const matches = content.match(importRegex) || [];
  return matches.length;
}

async function analyzePackage(packageName, options = {}) {
  const {
    maxFileSize = 100,
    maxFiles = 1,
    excludeFiles = ['README.md', 'LICENSE', 'package.json'],
    excludeExtensions = ['.md', '.txt']
  } = options;

  try {
    const packageInfo = await fetchPackageInfo(packageName);
    const latestVersion = packageInfo['dist-tags'].latest;
    const files = await downloadAndExtractPackage(packageName, latestVersion);

    const relevantFiles = files.filter(file => 
      !excludeFiles.includes(file.path.split('/').pop()) && 
      !excludeExtensions.includes(file.path.split('.').pop())
    );

    let totalSize = 0;
    let totalImports = 0;
    let fileAnalysis = [];

    for (const file of relevantFiles) {
      const fileSize = calculateNonCommentSize(file.content);
      const importCount = countImports(file.content);
      totalSize += fileSize;
      totalImports += importCount;

      fileAnalysis.push({
        path: file.path,
        size: fileSize,
        imports: importCount,
        importsToSizeRatio: importCount / fileSize
      });
    }

    const isMicro = relevantFiles.length <= maxFiles && totalSize <= maxFileSize * maxFiles;

    return {
      isMicropackage: isMicro,
      fileCount: relevantFiles.length,
      totalSize,
      totalImports,
      overallImportsToSizeRatio: totalImports / totalSize,
      fileAnalysis
    };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

module.exports = analyzePackage;