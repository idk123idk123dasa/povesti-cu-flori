<template>
  <div v-if="loading" class="loading">Se încarcă...</div>
  <div v-else-if="product" class="product-page">
    <div class="product-gallery">
      <img :src="storyImages[product.slug] || product.gallery?.[0] || ''" :alt="product.title" />
    </div>
    <div class="product-info">
      <h1>{{ product.title }}</h1>
      <div class="product-subtitle">{{ product.subtitle }}</div>
      <div class="product-price">{{ product.price }}</div>
      <div class="product-price-note">{{ product.priceNote }}</div>
      <p class="product-description">{{ product.description }}</p>
      <ul class="product-features">
        <li v-for="f in product.features" :key="f">{{ f }}</li>
      </ul>
      <button class="btn btn-primary" style="width: 100%;">Adaugă în coș</button>
      <div style="margin-top: 20px; text-align: center;">
        <router-link to="/pagini/cadou-printabil" style="font-family: var(--font-lato); font-size: 14px; color: var(--color-btn-primary);">
          🎁 Acesta este un cadou? Descarcă cardul cadou
        </router-link>
      </div>
    </div>
  </div>
  <div v-else class="not-found">
    <h2>Povestea nu a fost găsită</h2>
    <router-link to="/povesti" class="btn btn-outline-dark">Vezi toate poveștile</router-link>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'

const route = useRoute()
const { data: product, loading, fetchData } = useApi()

const storyImages = {
  'camellia-grace': 'https://ucarecdn.com/ac57e4c5-04ea-4ea2-aeec-d650c2b9747c/-/format/auto/-/preview/3000x3000/-/quality/lighter/New%20Release%20_2_.png',
  'orchid-mae': 'https://ucarecdn.com/1e0c681b-cb31-440c-aa5f-56539b0463d6/-/format/auto/-/preview/800x800/-/quality/lighter/7.png',
  'audrey-rose': 'https://ucarecdn.com/6ef4da1d-f653-4d49-880c-55edc87f0700/-/format/auto/-/preview/3000x3000/-/quality/lighter/2.png',
  'audrey-rose-prepaid': 'https://ucarecdn.com/6ef4da1d-f653-4d49-880c-55edc87f0700/-/format/auto/-/preview/3000x3000/-/quality/lighter/2.png',
  'lily-clara': 'https://ucarecdn.com/3b970f0f-73d0-440f-a5da-876a561dc1ef/-/format/auto/-/preview/3000x3000/-/quality/lighter/3.png',
  'adelaide-magnolia': 'https://ucarecdn.com/89c8c81a-36de-4d64-b4d3-04a1174a4733/-/format/auto/-/preview/3000x3000/-/quality/lighter/4.png',
  'norah-aven': 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png',
  'norah-aven-2': 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png',
  'norah-aven-3': 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png',
  'norah-aven-complete': 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png',
}

async function loadProduct() {
  await fetchData(`products/${route.params.slug}`)
  if (product.value?.seo) document.title = product.value.seo.title
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)
</script>
