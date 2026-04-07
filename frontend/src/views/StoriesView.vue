<template>
  <div>
    <section class="stories-hero">
      <h1>Poveștile noastre</h1>
      <p>Alege povestea care te inspiră. Fiecare colecție include 24 de scrisori ilustrate manual.</p>
    </section>

    <section class="stories-section">
      <div class="stories-grid">
        <router-link
          v-for="story in stories"
          :key="story.slug"
          :to="`/povesti/${story.slug}`"
          class="story-card"
        >
          <img class="story-card-img" :src="story.image" :alt="story.title" />
          <h3>{{ story.title }}</h3>
          <span class="story-subtitle">{{ story.subtitle }}</span>
          <div style="margin-top: 10px; font-family: var(--font-lato); font-size: 15px; color: var(--color-btn-primary); font-weight: 700;">
            {{ story.price }}
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
const stories = [
  { slug: 'camellia-grace', title: 'Camellia Grace', subtitle: 'Romantic din Epoca de Aur', price: '$12/lună', image: 'https://ucarecdn.com/ac57e4c5-04ea-4ea2-aeec-d650c2b9747c/-/format/auto/-/preview/3000x3000/-/quality/lighter/New%20Release%20_2_.png' },
  { slug: 'orchid-mae', title: 'Orchid Mae', subtitle: 'Aventură arheologică', price: '$120/an', image: 'https://ucarecdn.com/1e0c681b-cb31-440c-aa5f-56539b0463d6/-/format/auto/-/preview/800x800/-/quality/lighter/7.png' },
  { slug: 'audrey-rose', title: 'Audrey Rose', subtitle: 'Romantic din Al Doilea Război Mondial', price: '$13/lună', image: 'https://ucarecdn.com/6ef4da1d-f653-4d49-880c-55edc87f0700/-/format/auto/-/preview/3000x3000/-/quality/lighter/2.png' },
  { slug: 'lily-clara', title: 'Lily Clara', subtitle: 'Aventură western', price: '$120/an', image: 'https://ucarecdn.com/3b970f0f-73d0-440f-a5da-876a561dc1ef/-/format/auto/-/preview/3000x3000/-/quality/lighter/3.png' },
  { slug: 'adelaide-magnolia', title: 'Adelaide Magnolia', subtitle: 'Romantic din epoca Regenței', price: '$120/an', image: 'https://ucarecdn.com/89c8c81a-36de-4d64-b4d3-04a1174a4733/-/format/auto/-/preview/3000x3000/-/quality/lighter/4.png' },
  { slug: 'norah-aven', title: 'Norah Aven - Partea 1', subtitle: 'Aventură fantasy', price: '$120/an', image: 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png' },
  { slug: 'norah-aven-2', title: 'Norah Aven - Partea 2', subtitle: 'Aventură fantasy', price: '$120/an', image: 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png' },
  { slug: 'norah-aven-3', title: 'Norah Aven - Partea 3', subtitle: 'Aventură fantasy', price: '$120', image: 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png' },
  { slug: 'norah-aven-complete', title: 'Norah Aven - Seturi Complete', subtitle: 'Aventură fantasy', price: '$300', image: 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png' },
  { slug: 'audrey-rose-prepaid', title: 'Audrey Rose - Preplătit', subtitle: 'Romantic din Al Doilea Război Mondial', price: '$120', image: 'https://ucarecdn.com/6ef4da1d-f653-4d49-880c-55edc87f0700/-/format/auto/-/preview/3000x3000/-/quality/lighter/2.png' },
]
</script>
