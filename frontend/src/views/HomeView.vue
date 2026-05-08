<template>
  <div v-if="loading" class="loading">Se încarcă...</div>
  <div v-else-if="page">
    <!-- Hero Banner with Background Image (Section 0) -->
    <section class="hero-banner">
      <div class="hero-banner-overlay"></div>
      <div class="hero-banner-content">
        <h1>Ceva frumos<br/>vine prin poștă.</h1>
        <p>{{ page.hero.subtitle }}</p>
        <router-link to="/povesti" class="btn btn-white">Explorează poveștile</router-link>
      </div>
    </section>

    <!-- Hero Logo Ribbon + Image (Section 1) -->
    <section class="hero-section">
      <div class="hero-logo-ribbon">
        <img src="https://ucarecdn.com/5b5d0419-5827-45fc-b1fe-b8f3209ff023/-/format/auto/-/preview/3000x3000/-/quality/lighter/Logo-Ribbon-3.png" alt="Scrisori cu Povești" />
      </div>
      <div class="hero-main">
        <img class="hero-main-image" src="https://ucarecdn.com/32abd8ac-957e-420d-b621-d65ee907bb8b/-/format/auto/-/preview/3000x3000/-/quality/lighter/Home%20Page%20Hero%20Mobile%20_1_.jpg" alt="" />
        <h1>{{ page.hero.title }}</h1>
        <p>Scrisori cu povești ilustrate manual, livrate direct în cutia poștală, de două ori pe lună. Cadoul pe care mamele chiar și-l amintesc.</p>
        <router-link to="/povesti" class="btn btn-outline-dark">Găsește povestea perfectă</router-link>
      </div>
    </section>

    <!-- Floral divider -->
    <img class="floral-divider" src="https://ucarecdn.com/ee305010-8f9f-4095-9a49-6c5450cbd5ac/Floral-Art-Left.gif" alt="" />

    <!-- Secondary Hero (Section 2) -->
    <section class="secondary-hero">
      <h2>{{ page.secondaryHero.title }}</h2>
      <p>{{ page.secondaryHero.description }}</p>
      <router-link to="/povesti" class="btn btn-primary">Explorează poveștile</router-link>
    </section>

    <!-- Stories Grid (Section 3) -->
    <section class="stories-section">
      <h2 class="stories-section-title">Poveștile noastre</h2>
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
        </router-link>
      </div>
      <!-- Video in frame -->
      <div class="video-frame">
        <video autoplay loop muted playsinline>
          <source src="https://poze.scrisoricupovesti.ro/1778061135638-4leis6.mp4" type="video/mp4" />
        </video>
      </div>

      <div class="stories-cta">
        <router-link to="/povesti" class="btn btn-outline-dark">Explorează poveștile noastre</router-link>
      </div>
    </section>

    <!-- Floral divider bottom -->
    <img class="floral-divider" src="https://ucarecdn.com/3ecc8653-d44e-413f-af07-e6d16cae5aea/Floral-Desktop-Bottom.gif" alt="" />

    <!-- Testimonials -->
    <section class="testimonials-section">
      <img class="five-stars" src="https://ucarecdn.com/30cb409c-59e4-4247-8b96-b0b1f7a4b0ee/-/format/auto/-/preview/3000x3000/-/quality/lighter/Five%20Star%20_2_.png" alt="5 stele" />
      <div class="testimonials-grid">
        <div v-for="(t, i) in page.testimonials" :key="i" class="testimonial-card">
          <blockquote>{{ t.text }}</blockquote>
          <div class="testimonial-author">- {{ t.author }}, <span class="testimonial-badge">{{ t.badge }}</span></div>
        </div>
      </div>
      <div class="testimonials-cta">
        <router-link to="/pagini/recenzii" class="btn btn-outline-dark">Vezi toate recenziile</router-link>
      </div>
    </section>

    <!-- Meet Creators (Section 4) -->
    <section class="creators-section">
      <div class="creators-inner">
        <div class="creators-image">
          <img src="https://ucarecdn.com/ed1cdf90-61e8-4f4e-9a8b-438ff0041b5a/-/format/auto/-/preview/3000x3000/-/quality/lighter/IMG_6601.jpeg" alt="Creatorii" />
        </div>
        <div class="creators-text">
          <h2>Cunoaște creatorii</h2>
          <p class="creators-subtitle">Bine ai venit — ne bucurăm că ești aici!</p>
          <p>Noi suntem Michael și Hannie Clark. Împreună am creat Scrisori cu Povești din dorința de a readuce magia scrisorilor în viața oamenilor. Fiecare scrisoare este scrisă cu dragoste, ilustrată manual și trimisă cu grijă.</p>
          <router-link to="/pagini/despre-autor" class="btn btn-outline-dark" style="margin-top: 12px;">Află mai mult</router-link>
        </div>
      </div>
    </section>

    <!-- Stamp divider -->
    <img class="floral-divider" src="https://ucarecdn.com/8b87bb2b-e67b-459a-9590-2e67f976b06a/-/format/auto/-/preview/3000x3000/-/quality/lighter/Stamp-Top-Mobile@2x.png" alt="" />

    <!-- Newsletter (Section 6) -->
    <section class="newsletter-section">
      <h2>Abonare Newsletter</h2>
      <p>Înscrie-te pentru oferte exclusive, povești originale, evenimente și multe altele.</p>
      <div class="newsletter-form">
        <input type="email" placeholder="Adresa ta de email" />
        <button>Trimite</button>
      </div>
    </section>

    <!-- Footer floral -->
    <img style="width: 100%;" src="https://ucarecdn.com/50c0c0a1-fea6-461a-a64f-6dd0881d6366/-/format/auto/-/preview/3000x3000/-/quality/lighter/Footer-Bottom-Desktop.jpg" alt="" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi.js'

const { data: page, loading, fetchData } = useApi()

const stories = [
  { slug: 'camellia-grace', title: 'Camellia Grace', subtitle: 'Romantic din Epoca de Aur', image: 'https://ucarecdn.com/ac57e4c5-04ea-4ea2-aeec-d650c2b9747c/-/format/auto/-/preview/3000x3000/-/quality/lighter/New%20Release%20_2_.png' },
  { slug: 'orchid-mae', title: 'Orchid Mae', subtitle: 'Aventură arheologică', image: 'https://ucarecdn.com/1e0c681b-cb31-440c-aa5f-56539b0463d6/-/format/auto/-/preview/800x800/-/quality/lighter/7.png' },
  { slug: 'audrey-rose', title: 'Audrey Rose', subtitle: 'Romantic din Al Doilea Război Mondial', image: 'https://ucarecdn.com/6ef4da1d-f653-4d49-880c-55edc87f0700/-/format/auto/-/preview/3000x3000/-/quality/lighter/2.png' },
  { slug: 'lily-clara', title: 'Lily Clara', subtitle: 'Aventură western', image: 'https://ucarecdn.com/3b970f0f-73d0-440f-a5da-876a561dc1ef/-/format/auto/-/preview/3000x3000/-/quality/lighter/3.png' },
  { slug: 'adelaide-magnolia', title: 'Adelaide Magnolia', subtitle: 'Romantic din epoca Regenței', image: 'https://ucarecdn.com/89c8c81a-36de-4d64-b4d3-04a1174a4733/-/format/auto/-/preview/3000x3000/-/quality/lighter/4.png' },
  { slug: 'norah-aven', title: 'Norah Aven', subtitle: 'Aventură fantasy', image: 'https://ucarecdn.com/22a92b99-80bd-4366-b457-6930cd8ea3ba/-/format/auto/-/preview/3000x3000/-/quality/lighter/6.png' },
]

onMounted(() => fetchData('homepage'))
</script>
