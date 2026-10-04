<template>
  <button class="btn" @click="count++">
    {{ count }}
  </button>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.btn {
  display: block;
  margin: 0 auto;
}
</style>
