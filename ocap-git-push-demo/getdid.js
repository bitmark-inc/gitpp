'use strict';

const jsonld = require('jsonld');
const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation, ExpirationCaveat } = ocapld;

const { BranchCaveat } = require("./caveats");


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
  console.error('usage: %s %s <options> branch-spec…',
	        process.argv[0], process.argv[1]);

  console.error('       --help             -h            this message');
  console.error('       --verbose          -v            more messages');
  console.error('       --full-did         -f            output full did instead of ids');

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

  let parser = new mod_getopt.BasicParser('h(help)f(full-did)v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 'f':
      full_did = true;
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
  if (0 == commandArguments.length) {
    usage('missing required public key arguments argument(s)');
  }

  if (verbose >= 3) {
    debug('3: args:', commandArguments);
  }


  let results = commandArguments.map(
    (publicKey) => {

      debug('public key:', publicKey);
      const myPk = {
        "publicKeyBase58": publicKey,
        "privateKeyBase58": ""
      };

      const myKeyPair = new Ed25519KeyPair(myPk);

      const did = keyToDidDoc(myKeyPair);
      //debug('=====> did:', JSON.stringify(did, null, 2));

      if (full_did) {
        return did;
      } else {
        return {
          id: did.id,
          pubLicKeyBase58: publicKey
        };
      }
    });

  // output results to stdout
  console.log(JSON.stringify(results, null, 2));
})();
