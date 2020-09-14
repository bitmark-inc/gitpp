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
   * @return {Promise<object>} resolves to can object with `valid` and `error`.
   */
  async validate(caveat) {
    try {
      console.log('***1 caveat: ', JSON.stringify(caveat, null, 2));
      console.log('***2 caveat: ', caveat);
      console.log('***3 caveat: ', caveat['git:branchRegExp']);
      const regex = RegExp(caveat['git:branchRegExp']['@value']);
      if (!regex.test(this.branch)) {
        throw new Error('The capability is not allowed to write to this branch:', this.branch);
      }
      return { valid: true };
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
