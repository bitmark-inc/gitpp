/*
 * Copyright (c) 2020 Bitmark Inc. All rights reserved.
 */

import * as  jsonld from "jsonld";
import {
  Caveat
} from "ocapld";

interface ActionCaveatOptions {
  action?: string | Array<string>;
}

interface BranchCaveatOptions {
  branch?: string;
  branchRegExp?: Array<string>;
}

export class ActionCaveat extends Caveat {
  /**
   * @param [action] {string} allowed action. For example, 'read' or 'write
   */

  type?: string
  allowedAction: string | Array<string>

  constructor(options: ActionCaveatOptions) {
    super({
      type: 'capabilityAction'
    });
    if (options.action !== undefined && options.action.length !== 0) {
      this.allowedAction = options.action
    } else {
      this.allowedAction = 'read'
    }
  }

  /**
   * Validate capability action
   */
  async validate(caveat) {
    try {
      const targetAction = this.allowedAction
      const allowedAction = caveat.allowedAction;

      if (Array.isArray(targetAction)) {
        for (const a of targetAction) {
          if (Array.isArray(allowedAction)) {
            if (allowedAction.indexOf(a) === -1) {
              throw new Error('allowedAction mismatched: not found');
            }
          } else {
            if (a !== allowedAction) {
              throw new Error('allowedAction mismatched: not found');
            }
          }
        }
      } else {
        if (Array.isArray(allowedAction)) {
          if (allowedAction.indexOf(targetAction) === -1) {
            throw new Error('allowedAction value mismatched: not found');
          }
        } else {
          if (targetAction !== allowedAction) {
            throw new Error('allowedAction mismatched: not found');
          }
        }
      }

      return {
        valid: true
      };
    } catch (error) {
      return {
        valid: false,
        error
      };
    }
  }

  /**
   * Adds this caveat to a given capability.
   */
  async update(capability) {
    jsonld.addValue(capability, 'caveat', {
      type: this.type,
      allowedAction: this.allowedAction
    });
    return capability;
  }
}


export class BranchCaveat extends Caveat {
  /**
   * @param [branch] {string} the current branch to use to
   *   validate an branch caveat.
   * @param [branchRegExp] {string} the regular expression of acceptable branched to
   *   attach to a capability as a caveat.
   */

  type?: string
  branch?: string
  branchRegExp?: Array<string>

  constructor(options: BranchCaveatOptions) {
    super({ type: 'git:branchCaveat' });
    if (options.branch !== undefined) {
      this.branch = options.branch
    }

    if (options.branchRegExp !== undefined && Array.isArray(options.branchRegExp)) {
      this.branchRegExp = options.branchRegExp
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
      let allowed = false;
      const regexData = caveat['branchRegExp'];
      const branch = this.branch
      if (branch) {
        if (Array.isArray(regexData)) {
          allowed = regexData.reduce((acc, value) => {
            return acc || RegExp(value['@value']).test(branch);
          }, false);
        } else {
          allowed = RegExp(regexData['@value']).test(branch);
        }
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
}
