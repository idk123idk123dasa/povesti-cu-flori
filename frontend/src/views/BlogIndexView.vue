<template>
  <div v-if="loading" class="loading">Se încarcă...</div>
  <div v-else>
    <section class="hero" style="padding: 60px 0;">
      <div class="container">
        <h1>Blog — {{ categoryLabel }}</h1>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="stories-grid" v-if="posts && posts.length">
          <router-link
            v-for="post in posts"
            :key="post.slug"
            :to="`/blog/${route.params.category}/${post.slug}`"
            class="story-card"
          >
            <div class="story-card-body">
              <h3>{{ post.title }}</h3>
            </div>
          </router-link>
        </div>
        <p v-else style="text-align: center;">Nu sunt articole în această categorie.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const route = useRoute()
const { data: blogIndex, loading, fetchData } = useApi()
const posts = computed(() => blogIndex.value?.[route.params.category] || [])

const labels = {
  'audrey-rose': 'Audrey Rose',
  'adelaide-magnolia': 'Adelaide Magnolia',
  'orchid-mae': 'Orchid Mae',
}
const categoryLabel = computed(() => labels[route.params.category] || route.params.category)

onMounted(() => fetchData('blogs/index'))
watch(() => route.params.category, () => fetchData('blogs/index'))
</script>
