'use strict';

const fs = require('fs');

const jsonld = require('jsonld');

const didIo = require('did-io');
const keyDriver = require('did-method-key');
const {keyToDidDoc} = keyDriver.driver();

// to use the did:key method
didIo.use('key', keyDriver.driver());

const jsonldLoader = jsonld.documentLoaders.node();
// or the XHR one: jsonld.documentLoaders.xhr()


const path = require('path');

const filestorePath = path.join(process.mainModule.path, 'ocaps');


/**
 * Debug message to stderr so as not to interferewith stdout pipe
 *
 * @param message - optional error message
 *
 * @return terminates the program
 */
function debug(...args) {
  //console.error('docloader:', ...args);
}

/**
 * Load a document from a URL
 *
 * @param url {string} the URL
 *
 * @return JSON document
 */
async function documentLoader(url) {

  if (0 == url.indexOf('https://bitmark.com/git/v1')) {
    const s = fs.readFileSync(path.join(filestorePath, '/bitmark.com/git/v1'), 'utf8');
    return {
      contextUrl: null,
      url: url,
      document: JSON.parse(s)
    };
  }

  if (0 == url.indexOf('urn:')) {
    debug('url==urn:', url);
    let fileName = url.substring(4, url.length);
    const s = fs.readFileSync(path.join(filestorePath, 'capabilities.json'), 'utf8');
    const documents = JSON.parse(s);
    return {
      contextUrl: null,
      url: url,
      document: documents[url]
    };
  }

  if (0 == url.indexOf('ssh:')) {
    debug('url==ssh:', url);
    let key = 'none';
    const keyIndex = url.indexOf('key=');
    if (keyIndex > 0) {
      key = url.substring(keyIndex+4, url.length);
    }
    return {
      contextUrl: null,
      url: url,
      document: {
        "@context": 'https://w3id.org/security/v2',
        "id": url,
        "controller": key
      }
    };
  }

  if (0 == url.indexOf('did:')) {
    debug('url==did:', url);
    const did = await didIo.get({did:url});
    return {
      contextUrl: null,
      documentUrl: url,
      document: did || null
    };
  }

  debug('next loader:', url);
  return await jsonldLoader(url);
}

module.exports = {
  documentLoader
};
