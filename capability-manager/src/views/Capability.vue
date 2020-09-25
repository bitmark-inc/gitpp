<template>
  <div id="grant">
    <h3>Capability Management</h3>
    <p>
      <small class="text-muted">Manage capabilities for users</small>
    </p>

    <ul class="nav nav-tabs justify-content-center" role="tablist">
      <li class="nav-item" role="presentation">
        <a
          class="nav-link active"
          data-toggle="tab"
          role="tab"
          aria-controls="repo"
          @click="switchTab('repo')"
          >Repository</a
        >
      </li>
      <li v-if="isAdmin" class="nav-item" role="presentation">
        <a
          class="nav-link"
          data-toggle="tab"
          role="tab"
          aria-controls="cap"
          @click="switchTab('cap')"
          >Capability</a
        >
      </li>
    </ul>

    <div class="tab-content" id="myTabContent">
      <p></p>
      <RepoSelection
        v-if="tab == 'repo'"
        :isAdmin="isAdmin"
        :githubToken="githubToken"
        :githubUsername="githubUsername"
      />
      <CapabilityList v-if="tab == 'cap'" :isAdmin="isAdmin" />
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import RepoSelection from "../components/RepoSelection.vue";
import CapabilityList from "../components/CapabilityList.vue";

@Options({
  components: {
    RepoSelection: RepoSelection,
    CapabilityList: CapabilityList,
  },

  methods: {
    switchTab(tabName: string) {
      this.tab = tabName;
    },
  },

  props: {
    isAdmin: Boolean,
    githubUsername: String,
    githubToken: String,
  },

  data() {
    return {
      tab: "repo",
    };
  },
})
export default class Grant extends Vue {}
</script>
