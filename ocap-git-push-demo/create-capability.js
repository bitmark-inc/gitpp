'use strict';

const fs = require('fs');

const jsonld = require('jsonld');
const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_URL, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation, CapabilityDelegation, Caveat, ExpirationCaveat } = ocapld;

const { BranchCaveat } = require("./caveats");
const { documentLoader } = require("./docloader");


/**
 * Debug message to stderr so as not to interferewith stdout pipe
 *
 * @param message - optional error message
 *
 * @return terminates the program
 */
function debug(...args) {
  console.error('create-capability:', ...args);
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

  console.error('       --help             -h            this message');
  console.error('       --verbose          -v            more messages');
  console.error('       --user=URL|DID     -u URL|DID    user URL or did:key:');
  console.error('       --user-key=N       -k N          user public key index [0]');
  console.error('       --issuer=URL|DID   -i URL|DID    issuer public key URL');
  console.error('       --issuer-key=N     -j N          issuer public key index [0]');
  console.error('       --issuer-sec=EdB58 -s EdB58      issuer secret key Base58');
  console.error('       --branch-re=RE     -b RE         regexp for branch restriction (multiple)');
  console.error('       --target=URL       -t URL        target of the capability');
  console.error('       --capability=FILE  -c FILE       filename to write delegated capability');

  process.exit(2);
}


/**
 * main program
 *
 * @param command line arguments
 *
 * @return 0 = success
 *         1 = fail
 *         2 = invalid arguments
 */
(async function main() {


  const mod_getopt = require('posix-getopt');

  let verbose = 0;
  let user = '';
  let userKeyIndex = 0;
  let issuer = '';
  let issuerKeyIndex = 0;
  let issuerSecret = '';
  let branchRE = ''; // single RE string or array of RE strings
  let target = '';
  let capabilityFile = '';
  let capabilityURL = '';

  let parser = new mod_getopt.BasicParser('h(help)' +
                                          'b:(branch-re)' +
                                          'c:(capability-file)' +
                                          'C:(capability-url)' +
                                          'i:(issuer)' +
                                          'j:(issuer-key)' +
                                          's:(issuer-sec)' +
                                          'k:(user-key)' +                                          'u:(user)' +
                                          't:(target)' +
                                          'v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'b':
      if (0 == option.optarg) {
        usage('branch-re option cannot be empty');
      }
      if (Array.isArray(branchRE)) {
        branchRE.push(option.optarg); // append successive regexps
      } else if (0 == branchRE.length) {
        branchRE = option.optarg;
      } else {
        // convert single string to array if second option detected
        branchRE = [branchRE, option.optarg];
      }
      break;

    case 'c':
      capabilityFile = option.optarg;
      break;

    case 'C':
      capabilityURL = option.optarg;
      break;

    case 'i':
      issuer = option.optarg;
      break;

    case 'j':
      issuerKeyIndex  = parseInt(option.optarg);
      break;

    case 's':
      issuerSecret  = option.optarg;
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

    case 'h':
    case '?':
    default:
      // error message already emitted by getopt
      usage();
    }
  }

  if (verbose >= 3) {
    debug('args:', process.argv);
    debug('optind:', parser.optind());
  }

  // strip script name and already processed options from command arguments
  // leaving just a list of branches
  const commandArguments = process.argv.slice(parser.optind());
  if (0 != commandArguments.length) {
    usage('extraneous extra argument(s)');
  }

  if (0 == branchRE.length) {
    usage('missing branch regexp');
  }
  if (0 == capabilityFile.length) {
    usage('missing capability file');
  }
  if (0 == capabilityURL.length) {
    usage('missing capability URL');
  }
  if (0 == issuer.length) {
    usage('missing issuer URL/DID');
  }
  if (0 == issuerSecret.length) {
    usage('missing issuer secret');
  }
  if (NaN == issuerKeyIndex) {
    usage('invalid issuer public key index');
  }
  if (0 == user.length) {
    usage('missing user URL/DID');
  }
  if (NaN == userKeyIndex) {
    usage('invalid user key index');
  }
  if (0 == target.length) {
    usage('missing target URL/ID');
  }

  if (verbose >= 3) {
    debug('branch-re:', branchRE);
  }


  // resolve issuer and user to documents

  const issuerDoc = await documentLoader(issuer);
  const issuerDelegationKey = issuerDoc.document.capabilityDelegation[issuerKeyIndex];

  const userDoc = await documentLoader(user);
  const userInvocationKey = userDoc.document.capabilityInvocation[userKeyIndex];


  // create signing key
  const issuerSigningKey = new Ed25519KeyPair({
    "publicKeyBase58": issuerDoc.document.publicKey[issuerKeyIndex].publicKeyBase58,
    "privateKeyBase58": issuerSecret
  });


  const capability = {
    '@context': [
      SECURITY_CONTEXT_URL,
      'https://bitmark.com/git/v1',
      { git: 'https://bitmark.com/git/v1' },
    ],
    id: capabilityURL,
    //parentCapability: 'http://127.0.0.1/ocaps/alice/caps/1',
    //invocationTarget: 'http://127.0.0.1/ocaps/alice/caps/1',
    parentCapability: target,
    invocationTarget: target,
    controller: issuer,
    delegator: issuerDelegationKey,
    invoker: userInvocationKey
    //invoker: user
  };

  // one month expiry
  const expires = new Date();
  expires.setTime(expires.getTime() + 30*24*60*60*1000);

  if (verbose >= 3) {
    debug('set expires:', expires);
  }

  new ExpirationCaveat({ expires }).update(capability);
  new BranchCaveat({ branchRegExp: branchRE }).update(capability);

  if (verbose >= 2) {
    debug('delegated:', JSON.stringify(capability, null, 2));
  }

  const signedCapability = await jsigs.sign(capability, {
    suite: new Ed25519Signature2018({
      key: issuerSigningKey,
      verificationMethod: issuerDelegationKey,
    }),
    purpose: new CapabilityDelegation({
      capabilityChain: [target],
    }),
    documentLoader: documentLoader
  });

  if (verbose >= 2) {
    debug('signed:', JSON.stringify(signedCapability, null, 2));
  }

  if (verbose >= 1) {
    debug('write delegated capability file:', capabilityFile);
  }

  fs.writeFile(capabilityFile, JSON.stringify(signedCapability), 'utf8', (err) => {
    if (err) {
      console.error('file open error', err);
      throw err;
    }
  });

})();
