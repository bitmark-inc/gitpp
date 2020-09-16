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
