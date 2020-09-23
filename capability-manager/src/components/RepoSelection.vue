<template>
  <div id="repo-selection" class="tab-pane fade show active">
    <h4>Repository Management</h4>
    <div id="user-pick" class="row">
      <div class="col-12">
        <form @submit.prevent="checkUsername">
          <div class="input-group" :class="{'is-invalid': !isUsernameValid }">
            <input
              type="text"
              class="form-control"
              :class="{'is-invalid': !isUsernameValid }"
              id="staticUsername"
              v-model="username"
              placeholder="Github Username"
            />
            <div class="input-group-append">
              <button class="btn btn-outline-primary" type="button" @click="checkUsername">Check</button>
            </div>
          </div>
          <div class="invalid-feedback">Invalid username in Github</div>
        </form>
      </div>
    </div>
    <p></p>
    <div id="repo-pick" class="row" v-if="profile">
      <div class="col-12">
        <h3>Granted repositories</h3>
        <div class="row" v-if="profile.repos.size">
          <div class="col-6" v-for="[id, repo] of profile.repos" :key="id">
            <div class="card">
              <div class="card-header text-center">
                <h5 class="my-0">
                  {{repo.name}}
                  <button
                    type="button"
                    class="close"
                    aria-label="Close"
                    @click="deleteRepo(id)"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </h5>
              </div>
              <div class="card-body">
                <dl class="row">
                  <dt class="col-4">Roles</dt>
                  <dd class="col-8">{{ repo.roles.join(", ") }}</dd>
                  <dt v-if="repo.branchRegExps" class="col-4">Branches</dt>
                  <dd v-if="repo.branchRegExps" class="col-8">{{ repo.branchRegExps.join(", ") }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <p v-else>None</p>
      </div>
    </div>
    <p></p>
    <div class="add" v-if="profile">
      <h3>Grant new repository</h3>

      <div id="repo-pick" class="row">
        <div class="col-6">
          <h4>Repository</h4>
          <form>
            <div class="form-group row">
              <div class="col-12">
                <div class="input-group">
                  <select class="form-control" v-model="selectedRepo" id="repoSelect">
                    <option value selected>Select a repository...</option>
                    <option :value="name" v-for="name in repos" v-bind:key="name">{{ name }}</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div id="role-pick" class="row" v-if="selectedRepo">
        <div class="col-6">
          <h4>Roles</h4>
          <form>
            <div class="form-group row">
              <div class="col-12">
                <div class="input-group">
                  <select multiple class="form-control" v-model="selectedRoles" id="roleSelect">
                    <option value disabled>Select roles...</option>
                    <option :value="role" v-for="role in roles" v-bind:key="role.id">{{ role.name }}</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div id="show-capabiliy" class="row" v-if="selectedRepo && selectedRoles.length">
        <div class="col-12">
          <h4>Capabilities</h4>
        </div>
        <div class="col-12">
          <ul>
            <li v-for="role in selectedRoles" :key="role.id">{{ role.branchRegExp }}</li>
          </ul>
        </div>
        <div class="col-12">
          <button type="button" class="btn btn-primary" @click="saveCapability">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import axios from "axios";
// import firebase from "firebase/app";
// import "firebase/auth";

import { db } from "../lib/firebase";

interface Action {
  name: string;
}

interface Role {
  id: string;
  name: string;
  branchRegExp: string;
}

interface Repository {
  full_name: string;
}

const roles: Array<Role> = [
  {
    id: "developer",
    name: "developer",
    branchRegExp: "^refs/heads/features/.*$",
  },
  {
    id: "tester",
    name: "tester(demo)",
    branchRegExp: "^refs/heads/test/.*$",
  },
];

@Options({
  async mounted() {
    // // TODO: figure out when to do re-authentication
    // if (!this.githubToken) {
    //   const user = firebase.auth().currentUser;
    //   if (user) {
    //     const provider = new firebase.auth.GithubAuthProvider();
    //     provider.addScope("repo");
    //     const result = await user.reauthenticateWithPopup(provider);
    //     if (result.credential) {
    //       const cred = result.credential as firebase.auth.OAuthCredential;
    //       this.githubToken = cred.accessToken;
    //     }
    //   }
    // }
    if (this.githubToken) {
      try {
        const r = await axios.get(
          "https://api.github.com/orgs/bitmark-inc/repos?per_page=100",
          { headers: { Authorization: "token " + this.githubToken } }
        );

        const repos = r.data as Array<Repository>;
        this.repos = repos.map((repo: Repository) => {
          return repo.full_name;
        });
      } catch (error) {
        console.log(error);
      }
    }
  },

  async unmounted() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },

  computed: {
    summarizedBranchRegExps() {
      const branchRegExps = new Array<string>();
      this.selectedRoles.forEach((role: Role) => {
        branchRegExps.push(role.branchRegExp);
      });
      return branchRegExps;
    },
  },

  methods: {
    async watchProfile(username: string) {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      this.unsubscribe = await db
        .collection("github-profile")
        .doc(username)
        .collection("repos")
        .onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
          const repos = new Map<string, any>();
          snapshot.forEach((doc: firebase.firestore.DocumentSnapshot) => {
            const data = doc.data();
            if (data) {
              repos.set(doc.id, data);
            }
          });
          this.profile.repos = repos;
        });
    },

    async checkUsername() {
      try {
        const r = await axios.head(
          "https://api.github.com/users/" + this.username
        );
        if (r.status === 200) {
          this.isUsernameValid = true;
          this.profile = { repos: [] };

          this.watchProfile(this.username);

          this.selectedRepo = "";
          this.selectedRoles = [];
        } else {
          this.isUsernameValid = false;
        }
      } catch (error) {
        this.isUsernameValid = false;
      }
    },

    async deleteRepo(repoId: string) {
      const repo = db
        .collection("github-profile")
        .doc(this.username)
        .collection("repos")
        .doc(repoId);

      const snapshot = await repo.get();
      if (snapshot.exists) {
        const caps = await repo.collection("caps").get();
        for (const cap of caps.docs) {
          await db
            .collection("capabilities")
            .doc(cap.id)
            .update({
              revoked: {
                reason: "permission changes",
                timestamp: +new Date(),
              },
            });
          await repo.collection("caps").doc(cap.id).delete();
        }
      }
      await repo.delete();
    },

    async saveCapability() {
      const reposCollection = db
        .collection("github-profile")
        .doc(this.username)
        .collection("repos");

      const doc = await reposCollection
        .where("name", "==", this.selectedRepo)
        .get();

      if (doc.size) {
        const caps = await reposCollection
          .doc(doc.docs[0].id)
          .collection("caps")
          .get();

        for (const cap of caps.docs) {
          await db
            .collection("capabilities")
            .doc(cap.id)
            .update({
              revoked: {
                reason: "permission changes",
                timestamp: +new Date(),
              },
            });

          await reposCollection
            .doc(doc.docs[0].id)
            .collection("caps")
            .doc(cap.id)
            .delete();
        }

        await reposCollection.doc(doc.docs[0].id).update({
          roles: this.selectedRoles.map((role: Role) => role.name),
          branchRegExps: this.summarizedBranchRegExps,
        });
      } else {
        await reposCollection.add({
          name: this.selectedRepo,
          roles: this.selectedRoles.map((role: Role) => role.name),
          branchRegExps: this.summarizedBranchRegExps,
        });
      }
    },
  },

  props: {
    githubToken: String,
  },

  data() {
    return {
      unsubscribe: null,

      isUsernameValid: true,
      username: "",
      profile: null,
      selectedRepo: "",
      selectedRoles: [],
      repos: new Map<string, any>(),
      roles: roles,
    };
  },
})
export default class RepoSelection extends Vue {}
</script>
