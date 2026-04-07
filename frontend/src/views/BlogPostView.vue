<template>
  <div v-if="loading" class="loading">Se încarcă...</div>
  <div v-else-if="post" class="section">
    <div class="container page-content">
      <h1>{{ post.title }}</h1>
      <div v-html="post.content"></div>
      <div style="margin-top: 40px;">
        <router-link :to="`/blog/${route.params.category}`" class="btn btn-dark">
          ← Înapoi la articole
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const route = useRoute()
const { data: post, loading, fetchData } = useApi()

async function load() {
  await fetchData(`blogs/${route.params.category}/${route.params.slug}`)
  if (post.value?.seo) document.title = post.value.seo.title
}

onMounted(load)
watch(() => route.params.slug, load)
</script>
