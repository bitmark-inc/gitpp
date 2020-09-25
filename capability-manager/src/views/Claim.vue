<template>
  <h3>Claim</h3>
  <p>
    <small class="text-muted">Claim you capability</small>
  </p>
  <div class="row">
    <div class="col-12">
      <pre class="border">{{ JSON.stringify(signData, null, 2) }}</pre>
      <button type="button" class="btn btn-primary" @click="refresh">
        Refresh
      </button>
    </div>
  </div>
  <hr />
  <div class="row">
    <div class="col-6">
      <form>
        <div class="form-group">
          <label for="user-did">DID Document</label>
          <textarea
            class="form-control"
            id="user-did"
            rows="10"
            v-model="did"
          ></textarea>
        </div>
      </form>
    </div>
    <div class="col-6">
      <form>
        <div class="form-group">
          <label for="user-did">DID Signature</label>
          <textarea
            class="form-control"
            id="user-did"
            rows="10"
            v-model="signature"
          ></textarea>
        </div>
      </form>
    </div>
  </div>
  <div class="row">
    <div class="col-12">
      <button type="button" class="btn btn-primary" @click="claim">
        Claim
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { v4 as uuidV4 } from "uuid";

import { User } from "firebase";
import axios from "axios";

import * as jsonld from "jsonld";
import * as jsigs from "jsonld-signatures";
import { driver as didDriver } from "did-method-key";
import { Ed25519KeyPair } from "crypto-ld";
import { CapabilityDelegation } from "ocapld";

const { Ed25519Signature2018 } = jsigs.suites;
const { PublicKeyProofPurpose } = jsigs.purposes;
const xhrDocumentLoader = jsonld.documentLoaders.xhr();

import { db } from "../lib/firebase";
import { BranchCaveat } from "../lib/capability";

@Options({
  methods: {
    downloadCaps(text: string) {
      const a = window.document.createElement("a");
      a.href = window.URL.createObjectURL(
        new Blob([text], { type: "application/json" })
      );
      a.download = "capabilities.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    refresh() {
      this.signData["nonce"] = (+new Date()).toString();
    },

    async claim() {
      let keyController, signature;
      try {
        keyController = JSON.parse(this.did);
        signature = JSON.parse(this.signature);
      } catch (error) {
        alert("invalid JSON");
        return;
      }

      if (signature.nonce !== this.signData["nonce"]) {
        alert("invalid timestamp");
        return;
      }

      try {
        const apiToken = await this.user.getIdToken();
        const res = await axios.post(
          "https://caps.test.bitmark.com/claim",
          { did: keyController, signature: signature },
          { headers: { Authorization: "Bearer " + apiToken } }
        );

        this.downloadCaps(JSON.stringify(res.data, null, 2));
      } catch (error) {
        if (error.response) {
          alert(error.response.data.name);
        } else {
          alert(error.message);
        }
      }
    },
    async customLoader(url: string) {
      if (url.startsWith("did:key")) {
        const didDocument = await didDriver().get({ url });
        return {
          contextUrl: null,
          document: didDocument,
          documentUrl: url,
        };
      } else if (url.startsWith("ssh:")) {
        try {
          const [repo, qs] = url
            .replace("ssh://git@github.com:", "")
            .split("?");

          let key = "";
          qs.split("&").forEach((s) => {
            if (s.startsWith("key=")) {
              key = s.replace("key", "");
            }
          });

          const r = await axios.head("https://github.com/" + repo);
          if (r.status === 200) {
            const doc = {
              contextUrl: "https://w3id.org/security/v2", // this is for a context via a link header
              document: {
                "@id": "https://github.com/" + repo,
                repository: "https://github.com/bitmark-inc/bitmarkd",
                controller: key,
              }, // this is the actual document that was loaded
              documentUrl: url, // this is the actual context URL after redirects
            };
            console.log(doc);
            return doc;
          }
        } catch (error) {
          console.log(error);
        }
      }
      // call the default documentLoader
      return xhrDocumentLoader(url);
    },
  },

  props: {
    user: Object as () => firebase.User,
    githubUsername: String,
    githubToken: String,
  },

  data() {
    return {
      signData: {
        "@context": jsigs.SECURITY_CONTEXT_URL,
        nonce: "1600062484004",
      },
      did: ``,
      signature: "{}",
    };
  },
})
export default class Capability extends Vue {}
</script>
