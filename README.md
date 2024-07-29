# is-micropackage
JavaScript/Node.js utility. Returns `true` if the given JS package is a micropackage. Useful for checking if you have garbage in your node_modules, etc.

I have certain [opinions](https://willmatthews.xyz/posts/npm-micropackages/) about the state of NPM and the many micropackages on there.
To poke fun at the situation I decided to make an NPM module, `is-micropackage`, which will give an opinionated classification for each NPM module provided to it, if it is a micropackage or not.

I intend on running this over *EVERY* single NPM package to generate some statistics on the prevalence of micropackages in the 'ecosystem' (although I'd classify it as more of a landfill).


Example usage:

```js
const analyzePackage = require('is-micropackage');

(async () => {
  const analysis = await analyzePackage('package-name', {
    maxFileSize: 200,
    maxFiles: 2,
    excludeFiles: ['README.md', 'LICENSE', 'package.json'],
    excludeExtensions: ['md', 'txt', 'json']
  });

  if (analysis) {
    console.log('Is it a micropackage?', analysis.isMicropackage);
    console.log('Total size:', analysis.totalSize, 'bytes');
    console.log('Total imports:', analysis.totalImports);
    console.log('Overall imports-to-size ratio:', analysis.overallImportsToSizeRatio);
    console.log('File analysis:', analysis.fileAnalysis);
  } else {
    console.log('Analysis failed');
  }
})();
```
