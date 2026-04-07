<template>
  <div v-if="loading" class="loading">Se încarcă...</div>
  <div v-else-if="page" class="page-section">
    <h1>{{ page.title }}</h1>
    <div v-html="page.content"></div>
  </div>
  <div v-else class="not-found">
    <h2>Pagina nu a fost găsită</h2>
    <router-link to="/" class="btn btn-outline-dark">Acasă</router-link>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const route = useRoute()
const { data: page, loading, fetchData } = useApi()

async function loadPage() {
  const type = route.path.startsWith('/politici') ? 'policies' : 'pages'
  await fetchData(`${type}/${route.params.slug}`)
  if (page.value?.seo) document.title = page.value.seo.title
}

onMounted(loadPage)
watch(() => route.params.slug, loadPage)
</script>
