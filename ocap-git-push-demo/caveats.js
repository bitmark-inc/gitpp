'use strict';

const jsonld = require('jsonld');

const ocapld = require('ocapld');
const { Caveat } = ocapld;


class BranchCaveat extends Caveat {
  /**
   * @param [branch] {string} the current branch to use to
   *   validate an branch caveat.
   * @param [branchRegExp] {string} the regular expression of acceptable branched to
   *   attach to a capability as a caveat.
   */
  constructor({ branch, branchRegExp } = {}) {
    super({ type: 'git:branchCaveat' });
    if (branch !== undefined) {
      this.branch = branch;
    }
    if (branchRegExp !== undefined) {
      this.branchRegExp = branchRegExp;
    }
  }

  /**
   * Determines if this caveat has been met.
   *
   * @param caveat {object} the caveat parameters.
   * @param options.capability {object} the full capability.
   *
   * @return {Promise<object>} resolves to an object with `valid` and `error`.
   */
  async validate(caveat) {
    try {
      let allowed = false;
      const regexData = caveat['git:branchRegExp'];
      if (Array.isArray(regexData)) {
        allowed = regexData.reduce((acc, value) => {
          return acc || RegExp(value['@value']).test(this.branch);
        }, false);
      } else {
        allowed = RegExp(regexData['@value']).test(this.branch);
      }
      return { valid: allowed };
    } catch (error) {
      return { valid: false, error };
    }
  }

  /**
   * Adds this caveat to the given capability.
   *
   * @param capability {object} the capability to add this caveat to.
   *
   * @return {Promise<object>} resolves to the capability.
   */
  async update(capability) {
    const branchRegExp = this.branchRegExp;
    jsonld.addValue(capability, 'caveat', {
      type: this.type,
      branchRegExp
    });
    return capability;
  }
};


module.exports = {
  BranchCaveat
};
