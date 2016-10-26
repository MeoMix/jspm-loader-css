/* eslint-env node */
import AbstractLoader from './abstractLoader.js';
import cssnano from 'cssnano';
import fs from 'fs';
import path from 'path';

// Append a <style> tag to the page and fill it with inline CSS styles.
const cssInjectFunction = `(function(c){
  var d=document,a="appendChild",i="styleSheet",s=d.createElement("style");
  d.head[a](s);
  s[i]?s[i].cssText=c:s[a](d.createTextNode(c));
})`;
// const cssInjectSourceMapsFunction = `(function(c){
//   var d=document,a='appendChild',s=d.createElement('link');
//   s.rel='stylesheet';
//   s.href=URL.createObjectURL(new Blob([c],{type:'text/css'}));
//   d.head[a](s);
// })`;

// Escape any whitespace characters before outputting as string so that data integrity can be preserved.
const escape = (source) => {
  return source
    .replace(/(["\\])/g, '\\$1')
    .replace(/[\f]/g, '\\f')
    .replace(/[\b]/g, '\\b')
    .replace(/[\n]/g, '\\n')
    .replace(/[\t]/g, '\\t')
    .replace(/[\r]/g, '\\r')
    .replace(/[\']/g, '\\\'')
    .replace(/[\u2028]/g, '\\u2028')
    .replace(/[\u2029]/g, '\\u2029');
};

const emptySystemRegister = (system, name) => {
  return `${system}.register('${name}', [], function() { return { setters: [], execute: function() {}}});`;
};

// const isWin = process.platform.match(/^win/);
// function fromFileURL(url) {
//   return url.substr(7 + !!isWin).replace(/\//g, isWin ? '\\' : '/');
// }

// const absRegEx = /^[a-z]+:/;

// const cwd = process.cwd();

export default class NodeLoader extends AbstractLoader {
  constructor(plugins) {
    super(plugins);

    this._injectableSources = [];

    this.bundle = this.bundle.bind(this);
    this.fetch = this.fetch.bind(this);
  }

  bundle(loads, compileOpts, outputOpts) {
    // let rootURL = outputOpts.rootURL;
    // let browserRootURL = outputOpts.browserRootURL;

    // if (rootURL && rootURL.substr(0, 5) == 'file:')
    //   rootURL = fromFileURL(rootURL);

    // if (browserRootURL && browserRootURL[browserRootURL.length - 1] !== '/')
    //   browserRootURL += '/';

    // const baseURLPath = fromFileURL(outputOpts.baseURL);

    /*eslint-disable no-console */
    if (outputOpts.buildCSS === false) {
      console.warn('Opting out of buildCSS not yet supported.');
    }

    // if (outputOpts.separateCSS === true) {
    //   console.warn('Separting CSS not yet supported.');
    // }

    if (outputOpts.sourceMaps === true) {
      console.warn('Source Maps not yet supported');
    }
    /*eslint-enable  no-console */

    return cssnano.process(this._injectableSources.join('\n'), {
      // A full list of options can be found here: http://cssnano.co/options/
      // safe: true ensures no optimizations are applied which could potentially break the output.
      safe: true
    }).then((result) => {
      let cssOutput = result.css;

      if (outputOpts.separateCSS) {
        const outFile = path.resolve(outputOpts.outFile).replace(/\.js$/, '.css');

        // if (outputOpts.sourceMaps) {
        //   fs.writeFileSync(`${outFile}.map`, result.map.toString());
        //   cssOutput += `\n/*# sourceMappingUrl='${outFile.split(/[\\/]/).pop()}.map`;
        // }

        fs.writeFileSync(outFile, cssOutput);
      } else {
        // Take all of the CSS files which need to be output and generate a fake System registration for them.
        // This will make System believe all files exist as needed.
        // Then, take the combined output of all the CSS files and generate a single <style> tag holding all the info.
        const fileDefinitions = loads
          .map((load) => emptySystemRegister(compileOpts.systemGlobal || 'System', load.name))
          .join('\n');

        // if (outputOpts.sourceMaps && outputOpts.inlineCssSourceMaps) {
        //   const sourceMap = JSON.parse(result.map.toString());
        //
        //   sourceMap.sources = sourceMap.sources.map(source => {
        //     if (source.match(absRegEx))
        //       return source;
        //
        //     if (source[0] !== '/')
        //       source = path.resolve(baseURLPath, source);
        //
        //     if (outputOpts.rootURL)
        //       return (outputOpts.browserRootURL || '/') + path.relative(outputOpts.rootURL, source).replace(/\\/g, '/');
        //
        //     return path.relative(baseURLPath, source).replace(/\\/g, '/');
        //   });
        //
        //   cssOutput += `\n/*# sourceMappingURL=data:application/json;base64,${new Buffer(JSON.stringify(sourceMap)).toString('base64')}*/`;
        //   return `${fileDefinitions}${cssInjectSourceMapsFunction}('${escape(cssOutput)}');`;
        // }

        return `${fileDefinitions}${cssInjectFunction}('${escape(cssOutput)}');`;
      }
    });
  }

  fetch(load, systemFetch) {
    return super.fetch(load, systemFetch)
      .then((styleSheet) => {
        this._injectableSources.push(styleSheet.injectableSource);
        return styleSheet;
      })
      // Return the export tokens to the js files
      .then((styleSheet) => styleSheet.exportedTokens);
  }
}
