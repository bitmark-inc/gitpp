<template>
  <div id="grant">
    <h3>Capability</h3>
    <p>
      <small class="text-muted">Manage capabilities for users</small>
    </p>
    <hr />

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
        <div class="row" v-if="profile.repos.length">
          <div class="col-6" v-for="repo in profile.repos" :key="repo.name">
            <div class="card">
              <div class="card-header text-center">
                <h5 class="my-0">{{repo.name}}</h5>
              </div>
              <div class="card-body">
                <dl class="row">
                  <dt class="col-4">Roles</dt>
                  <dd class="col-8">{{ repo.roles.join(", ") }}</dd>
                  <dt class="col-4">Actions</dt>
                  <dd class="col-8">{{ repo.actions.join(", ") }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <p v-else>None</p>
      </div>
    </div>
    <p></p>
    <div class="add-permission" v-if="profile">
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
            <template v-for="role in selectedRoles" :id="role.id">
              <li v-for="action in role.actions" :key="action.name">{{ action.name }}</li>
            </template>
          </ul>
        </div>
        <div class="col-12">
          <button type="button" class="btn btn-primary" @click="saveCapability">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

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
  actions: Action[];
}

interface Repository {
  full_name: string;
}

const roles: Array<Role> = [
  {
    id: "developer",
    name: "developer",
    actions: [{ name: "push-feature" }, { name: "merge-branch" }],
  },
  {
    id: "tester",
    name: "tester(demo)",
    actions: [{ name: "test-for-demo" }],
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
    totalActions() {
      const actions = new Array<string>();
      this.selectedRoles.forEach((role: Role) => {
        role.actions.forEach((action: Action) => {
          actions.push(action.name);
        });
      });
      return actions;
    },
  },

  methods: {
    async watchProfile(username: string) {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      this.unsubscribe = await db
        .collection("github-permission-profile")
        .doc(username)
        .collection("repos")
        .onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
          const repos: any = [];
          snapshot.forEach((doc: firebase.firestore.DocumentSnapshot) => {
            const data = doc.data();
            if (data) {
              repos.push(data);
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

    async saveCapability() {
      const doc = await db
        .collection("github-permission-profile")
        .doc(this.username)
        .collection("repos")
        .where("name", "==", this.selectedRepo)
        .get();

      if (doc.size) {
        await db
          .collection("github-permission-profile")
          .doc(this.username)
          .collection("repos")
          .doc(doc.docs[0].id)
          .update({
            roles: this.selectedRoles.map((role: Role) => role.name),
            actions: this.totalActions,
          });
      } else {
        await db
          .collection("github-permission-profile")
          .doc(this.username)
          .collection("repos")
          .add({
            name: this.selectedRepo,
            roles: this.selectedRoles.map((role: Role) => role.name),
            actions: this.totalActions,
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
      repos: [],
      roles: roles,
    };
  },
})
export default class Grant extends Vue {}
</script>
