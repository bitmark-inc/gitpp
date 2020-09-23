<template>
  <h3>Claim</h3>
  <p>
    <small class="text-muted">Claim you capability</small>
  </p>
  <div class="row">
    <div class="col-12">
      <pre class="border">{{ JSON.stringify(signData, null, 2) }}</pre>
      <button type="button" class="btn btn-primary" @click="refresh">Refresh</button>
    </div>
  </div>
  <hr />
  <div class="row">
    <div class="col-6">
      <form>
        <div class="form-group">
          <label for="user-did">DID Document</label>
          <textarea class="form-control" id="user-did" rows="10" v-model="did"></textarea>
        </div>
      </form>
    </div>
    <div class="col-6">
      <form>
        <div class="form-group">
          <label for="user-did">DID Signature</label>
          <textarea class="form-control" id="user-did" rows="10" v-model="signature"></textarea>
        </div>
      </form>
    </div>
  </div>
  <div class="row">
    <div class="col-12">
      <button type="button" class="btn btn-primary" @click="claim">Claim</button>
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

const privateKeyBase58 =
  "4KFqAQAtzE2UySaEjkTKGNqxz8dAaWthD6yUeeqQPiFYJgTh5UFNENkksPWooPxL7kPM8NaJ5GfEJdkZRVDgYfjU";
const publicKeyBase58 = "25VanJqXPwpDzzqTai7U2PiDRmMZhsKiS32WrFsP7x2z";

const sysPublicKey = {
  "@context": jsigs.SECURITY_CONTEXT_URL,
  type: "Ed25519VerificationKey2018",
  id: "did:bitmark:e4CHPviKRu5P6L5YQ15qYL77tfXEGua4U4maPTmzf4YwxCMA9d#key-1",
  controller: "did:bitmark:e4CHPviKRu5P6L5YQ15qYL77tfXEGua4U4maPTmzf4YwxCMA9d",
  publicKeyBase58,
};

let sysController;

(async function init() {
  const edKey = new Ed25519KeyPair({
    ...sysPublicKey,
    privateKeyBase58,
  });

  sysController = didDriver().keyToDidDoc(edKey);
})();

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
      let signature;
      try {
        signature = JSON.parse(this.signature);
      } catch (error) {
        console.log("invalid JSON");
        return;
      }

      if (signature.nonce !== this.signData["nonce"]) {
        console.log("invalid timestamp");
        return;
      }

      const keyController = JSON.parse(this.did);

      const result = await jsigs.verify(signature, {
        documentLoader: this.customLoader,
        suite: new Ed25519Signature2018(),
        purpose: new PublicKeyProofPurpose({
          controller: keyController,
          // date: new Date(parseInt(signature.nonce)), // set date to the time a doc is created
          // maxTimestampDelta: 10,
        }),
      });
      if (!result.verified) {
        console.log("invalid signature", result);
        return;
      }

      const snapshot = await db
        .collection("github-profile")
        .doc(this.githubUsername)
        .collection("repos")
        .get();

      const delegationCaps = new Map<string, any>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          const resourceID =
            "ssh://git@github.com:" + data.name + "?key=" + sysController.id;
          const cap = {
            "@context": [
              "https://w3id.org/security/v2",
              "https://capability-manager-demo.web.app/caps/v1/git.jsonld",
            ],
            id: "urn:uuid:" + uuidV4(),
            parentCapability: resourceID,
            invocationTarget: resourceID,
            delegator:
              "did:key:z6MkqyrirHAq8Acicq1FyNJGd9R7D1DW7Q8A3v1qqZfP4pdY",
            invoker: "did:key:z6MkqyrirHAq8Acicq1FyNJGd9R7D1DW7Q8A3v1qqZfP4pdY",
          };
          new BranchCaveat({
            branchRegExp: data.branchRegExps,
          }).update(cap);

          delegationCaps.set(doc.id, cap);
        }
      });

      // const signedCaps: any[] = [];
      const signedCapsMap = {};
      for (const [repoID, cap] of delegationCaps) {
        const signedCap = await jsigs.sign(cap, {
          documentLoader: this.customLoader,
          suite: new Ed25519Signature2018({
            key: new Ed25519KeyPair({
              ...sysController["publicKey"][0],
              privateKeyBase58,
            }),
          }),
          purpose: new CapabilityDelegation({
            capabilityChain: [cap.invocationTarget],
          }),
        });
        // signedCaps.push(signedCap);
        signedCapsMap[signedCap.id] = signedCap;
        await db
          .collection("github-profile")
          .doc(this.githubUsername)
          .collection("repos")
          .doc(repoID)
          .collection("caps")
          .doc(signedCap.id)
          .set({});
        // add new capability into capabilities collection
        await db
          .collection("capabilities")
          .doc(signedCap.id)
          .set({
            ...signedCap,
            revoked: false,
          });
      }

      this.downloadCaps(JSON.stringify(signedCapsMap, null, 2));
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
