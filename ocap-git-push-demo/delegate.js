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
  console.error('       --user=URL         -u URL        set the user URL');
  console.error('       --user-key=URL     -k URL        set the user public key URL');
  console.error('       --issuer-key=URL   -i URL        set the issuer public key URL');
  console.error('       --branch-re=RE     -b RE         regexp for branch restriction');
  console.error('       --root=FILE        -r FILE       filename to write root capability');
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
  let userKey = '';
  let issuerKey = '';
  let branchRE = '';
  let rootFile = '';
  let rootURL = '';
  let capabilityFile = '';
  let capabilityURL = '';

  let parser = new mod_getopt.BasicParser('h(help)b:(branch-re)' +
                                          'c:(capability-file)r:(root-file)' +
                                          'C:(capability-url)R:(root-url)' +
                                          'i:(issuer-key)u:(user)k:(user-key)' +
                                          'v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'b':
      branchRE = option.optarg;
      break;

    case 'c':
      capabilityFile = option.optarg;
      break;

    case 'C':
      capabilityURL = option.optarg;
      break;

    case 'i':
      issuerKey = option.optarg;
      break;

    case 'k':
      userKey = option.optarg;
      break;

    case 'r':
      rootFile = option.optarg;
      break;

    case 'R':
      rootURL = option.optarg;
      break;

    case 'u':
      user = option.optarg;
      break;

    case 'h':
    case '?':
    default:
      // error message already emitted by getopt
      usage();
    }
  }

  if (verbose >= 3) {
    console.log('args: ', process.argv);
    console.log('optind: ', parser.optind());
  }

  // strip script name and already processed options from command arguments
  // leaving just a list of branches
  const commandArguments = process.argv.slice(parser.optind());
  if (0 != commandArguments.length) {
    usage('extraneous extra argument(s)');
  }

  if (0 == issuerKey.length) {
    usage('missing issuer public key URL');
  }
  if (0 == user.length) {
    usage('missing user URL');
  }
  if (0 == userKey.length) {
    usage('missing user p[ubl;ic key URL');
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
  if (0 == rootFile.length) {
    usage('missing root file');
  }
  if (0 == rootURL.length) {
    usage('missing root URL');
  }

  if (verbose >= 3) {
    console.log('branch-re: ', branchRE);
  }



  const rootKeyPair = {
    "publicKeyBase58": "GycSSui454dpYRKiFdsQ5uaE8Gy3ac6dSMPcAoQsk8yq",
    "privateKeyBase58": "3Mmk4UzTRJTEtxaKk61LxtgUxAa2Dg36jF6VogPtRiKvfpsQWKPCLesKSV182RMmvMJKk6QErH3wgdHp8itkSSiF"
  };

  // load all documents from their URLs
  const loader = jsonld.documentLoaders.node();
  // or the XHR one: jsonld.documentLoaders.xhr()


  const rootCapability = {
    '@context': SECURITY_CONTEXT_V2_URL,
    id: rootURL,
    invoker: issuerKey,
    delegator: issuerKey
  };

  if (verbose >= 2) {
    console.log('root: ', JSON.stringify(rootCapability, null, 2));
  }

  if (verbose >= 1) {
    console.log('write root capability file: ', rootFile);
  }

  fs.writeFile(rootFile, JSON.stringify(rootCapability), 'utf8', (err) => {
    if (err) {
      console.error('file open error', err);
      throw err;
    }
  });


  const delegatedCapability = {
    '@context': [
      SECURITY_CONTEXT_URL,
      'http://127.0.0.1/ocaps/bitmark.com/git/v1',
      { git: 'http://127.0.0.1/ocaps/bitmark.com/git/v1' },
    ],
    id: capabilityURL,
    parentCapability: rootCapability.id,
    invocationTarget: rootCapability.id,
    invoker: userKey
  };

  // one month expiry
  const expires = new Date();
  expires.setTime(expires.getTime() + 30*24*60*60*1000);

  if (verbose >= 3) {
    console.log('set expires: ', expires);
  }


  new ExpirationCaveat({ expires }).update(delegatedCapability);
  new BranchCaveat({ branchRegExp: branchRE }).update(delegatedCapability);


  if (verbose >= 2) {
    console.log('delegated: ', JSON.stringify(delegatedCapability, null, 2));
  }

  if (verbose >= 1) {
    console.log('write delegated capability file: ', capabilityFile);
  }
  const delegatedCapabilitySigned = await jsigs.sign(delegatedCapability, {
    suite: new Ed25519Signature2018({
      key: new Ed25519KeyPair(rootKeyPair),
      verificationMethod: issuerKey,
    }),
    purpose: new CapabilityDelegation({
      capabilityChain: [rootCapability.id],
    }),
    documentLoader: loader
  });

  if (verbose >= 2) {
    console.log('signed: ', JSON.stringify(delegatedCapabilitySigned, null, 2));
  }

  fs.writeFile(capabilityFile, JSON.stringify(delegatedCapabilitySigned), 'utf8', (err) => {
    if (err) {
      console.error('file open error', err);
      throw err;
    }
  });

})();
