'use strict';

const jsonld = require('jsonld');
const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation, ExpirationCaveat } = ocapld;

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
  console.error('usage: %s %s <options> branch-spec…',
	        process.argv[0], process.argv[1]);

  console.error('       --help             -h            this message');
  console.error('       --verbose          -v            more messages');
  console.error('       --user=URL         -u URL        set the user name');
  console.error('       --user-key=URL     -k URL        set the user name');
  console.error('       --capability=URL   -c URL        set the delegated capability');
  console.error('       --root=URL         -r URL        set the root capability');

  process.exit(2);
}


/**
 * main program
 *
 * @param command line arguments: list of branches
 *
 * @return 0 = success, all branches are allowed
 *         1 = fail one or more branches disallowed
 *         2 = fail as no branches are specified
 */
(async function main() {


  const mod_getopt = require('posix-getopt');

  let verbose = 0;
  let userURL = '';
  let userKey = '';
  let capabilityURL = '';
  let rootCapabilityURL = '';

  let parser = new mod_getopt.BasicParser('h(help)' +
                                          'c:(capability-url)r:(root-url)' +
                                          'u:(user)k:(user-key)v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'c':
      capabilityURL = option.optarg;
      break;

    case 'r':
      rootCapabilityURL = option.optarg;
      break;

    case 'u':
      userURL = option.optarg;
      break;

    case 'k':
      userKey = option.optarg;
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
  if (0 == commandArguments.length) {
    usage('missing required branch argument(s)');
  }

  if (0 == userURL.length) {
    usage('missing user URL');
  }
  if (0 == userKey.length) {
    usage('missing user key');
  }
  if (0 == rootCapabilityURL.length) {
    usage('missing root capability URL');
  }
  if (0 == capabilityURL.length) {
    usage('missing delegated capability URL');
  }

  if (verbose >= 3) {
    console.log('args: ', commandArguments);
  }

  const myPk = {
    "publicKeyBase58": "CXbgG2vPnd8FWLAZHoLRn3s7PRwehWsoMu6v1HhN9brA",
    "privateKeyBase58": "3LftyxxRPxMFXwVChk14HDybE2VnBnPWaLX31WreZwc8V8xCCuoGL7dcyxnwkFXa8D7CZBwAGWj54yqoaxa7gUne"
  };

  const loader = jsonld.documentLoaders.node();
  // or the XHR one: jsonld.documentLoaders.xhr()

  // invoke the delegated capability
  const msg = {
    '@context': SECURITY_CONTEXT_V2_URL,
    id: capabilityURL, //'urn:uuid:cab83279-c695-4e66-9458-4327de49197a',
    nonce: (+new Date).toString(),
  };
  const invocation = await jsigs.sign(msg, {
    suite: new Ed25519Signature2018({
      creator: userKey,
      key: new Ed25519KeyPair(myPk)
    }),
    purpose: new CapabilityInvocation({
      capability: capabilityURL
    }),
    documentLoader: loader
  });

  if (verbose >= 1) {
    console.log('invocation: ', JSON.stringify(invocation, null, 2));
  }

  let allowed = await commandArguments.reduce(
    async (acc, branch) => {

      let result = await jsigs.verify(invocation, {
        suite: new Ed25519Signature2018(),
        purpose: new CapabilityInvocation({
          expectedTarget: rootCapabilityURL,
          suite: new Ed25519Signature2018(),
          caveat: [new ExpirationCaveat(), new BranchCaveat({ branch: branch })],
        }),
        documentLoader: loader
      });
      if (verbose >= 1) {
        console.log('push to branch "' + branch + '" allowed?', result.verified);
      }

      if (verbose >= 2) {
        console.log('result: ', JSON.stringify(result, null, 2));
      }

      if (!result.verified) {
        console.log('push to branch "' + branch + '" is forbidden');
      }

      return result.verified && acc;
    }, Promise.resolve(true));

  process.exit(allowed ? 0 : 1);
})();
