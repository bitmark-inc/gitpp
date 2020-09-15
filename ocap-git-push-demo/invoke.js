'use strict';

const jsonld = require('jsonld');
const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation, ExpirationCaveat } = ocapld;

const { BranchCaveat } = require("./caveats");

const theDocumentLoader = jsonld.documentLoaders.node();
// or the XHR one: jsonld.documentLoaders.xhr()


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
* create a signed delegated capability invocation
*
* @param capabilityURL {string} URL to delegated capability
*
* @param keyPair {Ed25519KeyPair} key pair object
*
* @param userKey {string} URL that corresponds to public key in keyPair
*        (Note: possible create a did:key:… from keyPair is this is null
*
* @param verbose {unsigned int} logging verbosity level (0 = no logging)
*
* @result {string} JSON encode signed capability invocation
*
*/
async function signInvocation(capabilityURL, keyPair, userKey, verbose) {
  const msg = {
    '@context': SECURITY_CONTEXT_V2_URL,
    id: capabilityURL,
    nonce: (+new Date).toString(),
  };
  const invocation = await jsigs.sign(msg, {
    suite: new Ed25519Signature2018({
      creator: userKey,
      key: keyPair
    }),
    purpose: new CapabilityInvocation({
      capability: capabilityURL
    }),
    documentLoader: theDocumentLoader
  });

  if (verbose >= 1) {
    console.log('1: invocation: ', JSON.stringify(invocation, null, 2));
  }

  // convert to compact JSON
  const strInvocation = JSON.stringify(invocation);
  return strInvocation;
}

/**
* run an invocation
*
* @param strInvocation {string} a JSON encoded signed invocation
*
* @param rootCapabilityURL {string} URL of the root of the capability tree
*
* @param branches {list[string]} list of branches that are being pushed
*
* @param verbose {unsigned int} logging verbosity level (0 = no logging)
*
* @result false = invocation failed
*         true  = invoked successfully
*/
async function runInvocation(strInvocation, rootCapabilityURL, branches, verbose) {

  const invocation = JSON.parse(strInvocation);

  let allowed = await branches.reduce(
    async (acc, branch) => {

      let result = await jsigs.verify(invocation, {
        suite: new Ed25519Signature2018(),
        purpose: new CapabilityInvocation({
          expectedTarget: rootCapabilityURL,
          suite: new Ed25519Signature2018(),
          caveat: [new ExpirationCaveat(), new BranchCaveat({ branch: branch })],
        }),
        documentLoader: theDocumentLoader
      });
      if (verbose >= 1) {
        console.log('1: push to branch "' + branch + '" allowed?', result.verified);
      }

      if (verbose >= 2) {
        console.log('2: result: ', JSON.stringify(result, null, 2));
      }

      if (!result.verified) {
        console.log('push to branch "' + branch + '" is forbidden');
      }

      return result.verified && acc;
    }, Promise.resolve(true));
  return allowed;
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
    console.log('3: args: ', process.argv);
    console.log('3: optind: ', parser.optind());
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
    console.log('3: args: ', commandArguments);
  }

  // simulate signing occuring in another process
  // and just returning a JSON signed value
  // by isolating the siging in a closure
  const strInvocation = await (() => {
    const myPk = {
      "publicKeyBase58": "CXbgG2vPnd8FWLAZHoLRn3s7PRwehWsoMu6v1HhN9brA",
      "privateKeyBase58": "3LftyxxRPxMFXwVChk14HDybE2VnBnPWaLX31WreZwc8V8xCCuoGL7dcyxnwkFXa8D7CZBwAGWj54yqoaxa7gUne"
    };

    const myKeyPair = new Ed25519KeyPair(myPk);
    return signInvocation(capabilityURL, myKeyPair, userKey, verbose);
  })();

  // ensure string is the only type passed
  if ('string' !== typeof(strInvocation)) {
    console.log('type of strInvocation: actual:', typeof(strInvocation), ' expected: string');
    process.exit(1);
  }

  // invoke capability
  const allowed = await runInvocation(strInvocation, rootCapabilityURL, commandArguments, verbose);

  process.exit(allowed ? 0 : 1);
})();
