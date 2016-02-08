/* eslint-env browser */
import debounce from 'debounce';
import { CSSModuleLoaderProcess } from './CSSModuleLoaderProcess';

const USE_STYLE_TAGS = !window.Blob || !window.URL || !URL.createObjectURL || navigator.userAgent.match(/phantomjs/i)

export class CSSLoaderDOM extends CSSModuleLoaderProcess {
  constructor (plugins) {
    super(plugins);
	
    this._jspmCssModulesContainer = document.createElement('jspm-css-modules');
    this._debouncedSortingAndInject = debounce(this._sortAndInjectInDom, 500).bind(this);

    document.getElementsByTagName('head')[0].appendChild(this._jspmCssModulesContainer);
  }

  fetch (load, systemFetch) {
    let styleSheet;
	
    return super.fetch(load, systemFetch)
      .then((_styleSheet) => styleSheet = _styleSheet)
      .then(this._storeInBlobs)
	  // TODO: Why is this debounced?
      // Debounce dep sorting and injection in the DOM
      .then(this._debouncedSortingAndInject)
      // Return the export tokens to the js files
      .then(() => styleSheet.exportedTokens);
  }

  _storeInBlobs (styleSheet) {
    if (USE_STYLE_TAGS) {
      return styleSheet;
    }

    const blob = new Blob([styleSheet.injectableSource], { type: 'text/css' });
    const blobUrl = URL.createObjectURL(blob);
    styleSheet.blobUrl = blobUrl;

    return styleSheet;
  }

  _sortAndInjectInDom (styleSheet) {
    const sortedDependencies = this._getSortedStylesDependencies();

    const styleTagsInjection = (depName) => `<style id="${this._styleMeta.get(depName).name}">${this._styleMeta.get(depName).injectableSource}</style>`;
    const linkTagsInjection = (depName) => `<link rel="stylesheet" id="${this._styleMeta.get(depName).name}" href="${this._styleMeta.get(depName).blobUrl}"/>`;
    const injectionFunc = USE_STYLE_TAGS ? styleTagsInjection : linkTagsInjection;

    this._jspmCssModulesContainer.innerHTML = sortedDependencies
      .map(injectionFunc)
      .join('');

    return styleSheet;
  }
}
