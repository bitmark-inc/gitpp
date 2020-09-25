<template>
  <div class="home">
    <nav
      class="navbar navbar-expand-lg navbar-light justify-content-between"
      style="background-color: #e3f2fd"
    >
      <a class="navbar-brand" href="#">Capability Management Demo</a>
      <button
        class="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav mr-auto">
          <li class="nav-item">
            <router-link
              :to="{ name: 'Capability' }"
              active-class="active"
              class="nav-link"
              >Capabilities</router-link
            >
          </li>
          <li class="nav-item">
            <router-link
              :to="{ name: 'Claim' }"
              active-class="active"
              class="nav-link"
              >Claim</router-link
            >
          </li>
        </ul>
        <form class="form-inline">
          <div class="form-group">
            <label for="staticEmail" class="sr-only">Email</label>
            <input
              type="text"
              readonly
              class="form-control-plaintext"
              id="staticEmail"
              v-model="email"
            />
          </div>
          <button class="btn btn-outline-success" @click="logout">
            Logout
          </button>
        </form>
      </div>
    </nav>
    <p style="text-align: center">
      <small class="text-muted"
        >This site is for demo. Not to use it in production.</small
      >
    </p>
    <div class="container" v-if="user">
      <router-view
        :user="user"
        :isAdmin="isAdmin"
        :githubToken="githubToken"
        :githubUsername="githubUsername"
      />
    </div>
  </div>
</template>


<style scoped>
.container {
  padding-top: 20px;
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";

import { db, auth, getCurrentUser } from "../lib/firebase";

@Options({
  methods: {
    async logout() {
      try {
        await auth.signOut();
        this.$router.push({ name: "Login" });
      } catch (error) {
        console.log(error);
      }
    },
  },

  async beforeCreate() {
    const user = await getCurrentUser();
    if (user) {
      const snapshot = await db.collection("users").doc(user.uid).get();
      const data = snapshot.data();
      if (!data) {
        throw new Error("can not get user info");
      }
      this.isAdmin = data.isAdmin;
      this.githubToken = data.github.accessToken;
      this.githubUsername = data.github.username;
      this.user = user;
      this.email = user.email;
    }
  },

  data() {
    return {
      isAdmin: false,
      githubUsername: "",
      githubToken: "",
      user: null,
      email: "",
    };
  },
})
export default class Home extends Vue {}
</script>
