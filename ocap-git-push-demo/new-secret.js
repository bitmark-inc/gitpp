'use strict';

const fs = require('fs');

const { KeyPairOptions, Ed25519KeyPair} = require('crypto-ld');

const keyDriver = require('did-method-key');
const {keyToDidDoc} = keyDriver.driver();


/**
 * Debug message to stderr so as not to interferewith stdout pipe
 *
 * @param message - optional error message
 *
 * @return terminates the program
 */
function debug(...args) {
  console.error('getdid:', ...args);
}

/**
 * Display usage message and exit
 *
 * @param message - optional error message
 *
 * @return terminates the program
 */
function usage(message) {
  if (message) {
    console.error('error: %s', message);
  }
  console.error('usage: %s %s <options>',
	        process.argv[0], process.argv[1]);

  console.error('       --help                  -h            this message');
  console.error('       --verbose               -v            more messages');
  console.error('       --full-did              -f            output full did instead of ids');
  console.error('       --secrets-file=FILE     -s FILE       add the secret to this JSON map');

  process.exit(2);
}

/**
 * main program
 *
 * @param command line arguments: list of Base58 public keys
 *
 * @return 0 = success
 *         1 = fail
 */
(async function main() {


  const mod_getopt = require('posix-getopt');

  let verbose = 0;
  let full_did = false;
  let userSecretsFile = '';

  let parser = new mod_getopt.BasicParser('h(help)f(full-did)s:(secrets-file)v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'f':
      full_did = true;
      break;

    case 's':
      userSecretsFile = option.optarg;
      break;

    case 'h':
    case '?':
    default:
      // error message already emitted by getopt
      usage();
    }
  }

  if (verbose >= 3) {
    debug('3: args:', process.argv);
    debug('3: optind:', parser.optind());
  }

  // strip script name and already processed options from command arguments
  // leaving just a list of branches
  const commandArguments = process.argv.slice(parser.optind());
  if (0 != commandArguments.length) {
    usage('extraneous extra argument(s)');
  }
  if (0 == userSecretsFile.length) {
    usage('missing secrets file');
  }

  const keyPair = await Ed25519KeyPair.generate();

  const did = keyToDidDoc(keyPair);

  if (full_did) {
    console.log('did:', JSON.stringify(did, null, 2));
  }

  const keyId = did.id + "#" + did.id.replace(/^did:key:/, '');

  if (verbose >= 1) {
    debug('write secrets file:', userSecretsFile);
  }

  // read secrets file
  let src = '{}';
  try {
    src = fs.readFileSync(userSecretsFile, 'utf8');
    if (0 == src.length) {
      src = '{}';
    }
  } catch (ENOENT) {
    src = '{}';
  }

  // add the new item to the map
  let documents = JSON.parse(src);
  documents[keyId] = keyPair;

  // rewrite file
  fs.writeFile(userSecretsFile, JSON.stringify(documents), 'utf8', (err) => {
    if (err) {
      console.error('file open error', err);
      throw err;
    }
  });

})();
