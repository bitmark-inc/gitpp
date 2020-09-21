'use strict';

const fs = require('fs');

const jsonld = require('jsonld');
const { KeyPairOptions } = require('crypto-ld');

const jsigs = require('jsonld-signatures');
const { Ed25519KeyPair, SECURITY_CONTEXT_V2_URL, suites } = jsigs;
const { Ed25519Signature2018 } = suites;

const ocapld = require('ocapld');
const { CapabilityInvocation, ExpirationCaveat } = ocapld;

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
  console.error('invoke:', ...args);
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
  console.error('       --target=URL       -t URL        target of the capability');

  process.exit(2);
}

/**
* run an invocation
*
* @param invocation {object} a JSON encoded signed invocation
*
* @param target {string} target of the capability tree
*
* @param branches {list[string]} list of branches that are being pushed
*
* @param verbose {unsigned int} logging verbosity level (0 = no logging)
*
* @result false = invocation failed
*         true  = invoked successfully
*/
async function runInvocation(invocation, target, branches, verbose) {

  let allowed = await branches.reduce(
    async (acc, branch) => {

      let result = await jsigs.verify(invocation, {
        suite: new Ed25519Signature2018(),
        purpose: new CapabilityInvocation({
          expectedTarget: target,
          suite: new Ed25519Signature2018(),
          caveat: [new ExpirationCaveat(), new BranchCaveat({ branch: branch })],
        }),
        documentLoader: documentLoader
      });
      if (verbose >= 1) {
        debug('1: push to branch "' + branch + '" allowed?', result.verified);
      }

      if (verbose >= 2) {
        debug('2: result:', JSON.stringify(result, null, 2));
      }

      if (!result.verified) {
        if (verbose >= 2) {
          // decode to JSON to be able to see the individual errors
          debug('2: result:', JSON.stringify(result, null, 2));
        } else if (verbose >= 1){

          result.results.forEach( (result) => {
            if (undefined !== result.error) {
              debug('1: result error:', result.error.message);
              if (undefined !== result.error.errors) {
                result.error.errors.forEach( (error) => {
                  debug('1: verify error:', error.message);
                });
              }
            }
          });
        }
        debug('push to branch: "' + branch + '" is forbidden');
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
  let target = '';

  let parser = new mod_getopt.BasicParser('h(help)' +
                                          't:(target)' +
                                          'v(verbose)', process.argv);
  let option;
  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
    case 'v':
      verbose += 1;
      break;

    case 't':
      target = option.optarg;
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
    usage('missing required branch argument(s)');
  }

  if (verbose >= 3) {
    debug('3: args:', commandArguments);
  }

  // get JSON signed invocation from stdin
  // let strInvocation = '';
  // fs.readFile(process.stdin.fd, 'utf8', (err, data) => {
  //   if (err) {
  //     throw err;
  //   }
  //   debug('data:', data);
  //   strInvocation += data;
  // });
  let strInvocation = fs.readFileSync(process.stdin.fd, 'utf8');

  const invocation = JSON.parse(strInvocation);

  // if target is not specified get it from the invocation
  if (0 == target.length) {
    target = invocation.invocationTarget.toString();
  }
  if (0 == target.length) {
    usage('missing capability target');
  }

  // remaining arguments are the list of branches that are being committed
  const branches = commandArguments;

  // invoke capability
  const allowed = await runInvocation(invocation, target, branches, verbose);

  process.exit(allowed ? 0 : 1);
})();
