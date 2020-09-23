'use strict';

const fs = require('fs');

const jsonld = require('jsonld');
//const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation } = ocapld;

const uuidv4 = require('uuid/v4');

const { documentLoader } = require("./docloader");


/**
 * Debug message to stderr so as not to interferewith stdout pipe
 *
 * @param message - optional error message
 *
 * @return terminates the program
 */
function debug(...args) {
  console.error('sign-invocation:', ...args);
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
  console.error('       --user=URL|DID          -u URL|DID    user public key URL');
  console.error('       --user-key=N            -k N          user public key index [0]');
  console.error('       --secrets-file=FILE     -s FILE       files of secret keys');
  console.error('       --capability=URL        -c URL        set the delegated capability');
  console.error('       --target=URL            -t URL        target of the capability');
  console.error('       --output-file=FILE      -f FILE       file to write signed invocation [stdout]');

  process.exit(2);
}



/**
* create a signed delegated capability invocation
*
* @param capabilityURL {string} URL to delegated capability
*
* @param target {string} target of the capability tree
*
* @param secretsFile {string} file of key pair objects
*
* @param userKey {string} URL that corresponds to public key in keyPair
*
* @param verbose {unsigned int} logging verbosity level (0 = no logging)
*
* @result {object} signed capability invocation
*
*/
async function signInvocation(capabilityURL, target, secretsFile, userKey, verbose) {

  // read secrets file
  const secrets = (() => {
    let src = '{}';
    try {
      src = fs.readFileSync(secretsFile, 'utf8');
      if (0 == src.length) {
        src = '{}';
      }
    } catch (ENOENT) {
      src = {};
    }

    return JSON.parse(src);
  })();


  const userSecret = secrets[userKey];
  if (null == userSecret) {
    throw new Error('no private key corresonding to: ' + userKey);
  }
  // create signing key
  const keyPair = new Ed25519KeyPair({
    publicKeyBase58: userSecret.publicKeyBase58,
    privateKeyBase58: userSecret.privateKeyBase58
  });


  const nonce = (+new Date).toString();

  const id = 'invoke:push:' + uuidv4();

  const msg = {
    '@context': SECURITY_CONTEXT_V2_URL,
    id: id,
    capabilityInvocation: capabilityURL,
    invocationTarget: target,
    nonce: nonce
  };
  const invocation = await jsigs.sign(msg, {
    suite: new Ed25519Signature2018({
      creator: userKey,
      key: keyPair
    }),
    purpose: new CapabilityInvocation({
      //expectedTarget: target,
      capability: capabilityURL
    }),
    documentLoader: documentLoader
  });

  if (verbose >= 1) {
    debug('1: invocation:', JSON.stringify(invocation, null, 2));
  }

  return invocation;
}


/**
 * main program
 *
 * @param command line arguments
 *
 * @return 0 = success
 *         1 = fail
 *         2 = fail invalid options
 */
(async function main() {


  const mod_getopt = require('posix-getopt');

  let verbose = 0;
  let user = '';
  let userKeyIndex = 0;
  let secretsFile = '';
  let capabilityURL = '';
  let target = '';
  let invocationFile = '';

  let parser = new mod_getopt.BasicParser('h(help)' +
                                          'c:(capability-url)' +
                                          't:(target)' +
                                          'u:(user)' +
                                          'k:(user-key)' +
                                          's:(secrets-file)' +
                                          'o:(output-file)' +
                                          'v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'c':
      capabilityURL = option.optarg;
      break;

    case 't':
      target = option.optarg;
      break;

    case 'u':
      user = option.optarg;
      break;

    case 'k':
      userKeyIndex = parseInt(option.optarg);
      break;

    case 's':
      secretsFile = option.optarg;
      break;

    case 'o':
      invocationFile = option.optarg;
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

  if (0 == user.length) {
    usage('missing user URL/DID');
  }
  if (0 == secretsFile.length) {
    usage('missing secrets file');
  }
  if (NaN == userKeyIndex) {
    usage('invalid user public key index');
  }
  if (0 == capabilityURL.length) {
    usage('missing delegated capability URL');
  }
  if (0 == target.length) {
    usage('missing capability target');
  }


  if (verbose >= 3) {
    debug('3: args:', commandArguments);
  }

  // simulate signing occuring in another process
  // and just returning a JSON signed value
  // by isolating the siging in a closure

  // resolve user to document
  const userDoc = await documentLoader(user);
  const userInvocationKey = userDoc.document.capabilityInvocation[userKeyIndex];

  // sign the document
  const signedInvocation = await signInvocation(capabilityURL, target, secretsFile, userInvocationKey, verbose);

  if (verbose >= 1) {
    debug('write signed invocation file:', invocationFile);
  }

  if ('' === invocationFile || '-' === invocationFile) {
    invocationFile = process.stdout.fd;
  }

  fs.writeFile(invocationFile, JSON.stringify(signedInvocation), 'utf8', (err) => {
    if (err) {
      console.error('file open error', err);
      throw err;
    }
  });

})();
