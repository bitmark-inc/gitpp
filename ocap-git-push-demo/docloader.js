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
    const s = fs.readFileSync('ocaps/bitmark.com/git/v1', 'utf8');
    return {
      contextUrl: null,
      url: url,
      document: JSON.parse(s)
    };
  }

  if (0 == url.indexOf('cap:')) {
    debug('url==cap:', url);
    let fileName = url.substring(4, url.length);
    const s = fs.readFileSync(fileName, 'utf8');
    return {
      contextUrl: null,
      url: url,
      document: JSON.parse(s)
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
        "controller": 'did:key:' + key
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
