<template>
  <div id="capability-list" class="tab-pane fade show active">
    <h4>Active Capability List</h4>
    <ul class="list-group" v-if="caps.length">
      <li class="list-group-item" v-for="c in caps" :key="c.id">
        {{ c.id }}
        <button
          type="button"
          class="close"
          aria-label="Close"
          @click="revokeCapability(c.id)"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </li>
    </ul>
    <p v-if="!caps.length">None</p>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import RepoSelection from "../components/RepoSelection.vue";

import { db } from "../lib/firebase";

@Options({
  async mounted() {
    this.watchList();
  },

  methods: {
    async watchList() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      this.unsubscribe = await db
        .collection("capabilities")
        .where("revoked", "==", false)
        .onSnapshot((snapshot: firebase.firestore.QuerySnapshot) => {
          const caps = new Array<any>();
          snapshot.forEach((doc: firebase.firestore.DocumentSnapshot) => {
            const data = doc.data();
            if (data) {
              caps.push(data);
            }
          });
          this.caps = caps;
        });
    },

    async revokeCapability(capId: string) {
      const snapshot = await db
        .collection("capabilities")
        .doc(capId)
        .update({
          revoked: {
            reason: "admin revoked",
            timestamp: +new Date(),
          },
        });
    },
  },

  data() {
    return {
      unsubscribe: null,
      caps: [],
    };
  },
})
export default class CapabilityList extends Vue {}
</script>
