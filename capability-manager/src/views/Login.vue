<template>
  <div class="container">
    <div class="login">
      <div class="row justify-content-center">
        <div class="col-12">
          <h1>Login</h1>
          <button id="github-button" class="btn btn-outline-secondary" @click="login">
            <i class="fa fa-github"></i> Sign in with Github
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
div.login {
  text-align: center;
  margin-top: 40px;
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import firebase from "firebase/app";
import "firebase/auth";

import { db, getCurrentUser } from "../lib/firebase";

@Options({
  methods: {
    async login() {
      try {
        const provider = new firebase.auth.GithubAuthProvider();
        provider.addScope("repo");
        const result = await firebase.auth().signInWithPopup(provider);

        // fetch github username
        let githubUsername;
        if (result.additionalUserInfo) {
          githubUsername = result.additionalUserInfo.username;
        }

        // fetch github access token
        let accessToken;
        if (result.credential) {
          const credential = result.credential as firebase.auth.OAuthCredential;
          // console.log(credential);
          accessToken = credential.accessToken;
        }

        const user = await getCurrentUser();
        if (user) {
          const profile = {
            github: {
              username: githubUsername,
              accessToken: accessToken,
            },
          };
          await db
            .collection("users")
            .doc(user.uid)
            .set(profile, { merge: true });
        } else {
          throw new Error("fail to log in");
        }

        this.$router.push({ name: "Capability" });
      } catch (error) {
        console.log(error);
      }
    },
  },
})
export default class Login extends Vue {}
</script>
