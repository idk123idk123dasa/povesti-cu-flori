<template>
  <header class="site-header">
    <div class="header-inner">
      <router-link to="/" class="site-logo">
        <img src="https://theflowerletters.com/cdn/shop/files/The-Flower-Letters-Logo_300x300.png?v=1660586173" alt="Scrisori cu Povești" />
      </router-link>

      <ul class="nav-links">
        <li class="nav-item">
          <button>Magazin</button>
          <div class="nav-dropdown">
            <router-link to="/povesti">Povești</router-link>
            <router-link to="/pagini/materiale-printabile">Materiale printabile</router-link>
            <router-link to="/povesti/norah-aven-2">Norah Aven 2</router-link>
            <router-link to="/povesti/norah-aven-3">Norah Aven 3</router-link>
            <router-link to="/povesti/norah-aven-complete">Norah Aven Seturi Complete</router-link>
            <router-link to="/pagini/despre-autor">Despre Autor</router-link>
          </div>
        </li>
        <li class="nav-item">
          <button>Cadouri</button>
          <div class="nav-dropdown">
            <router-link to="/pagini/cadouri">Scrisori cadou</router-link>
            <router-link to="/pagini/cadou-printabil">Cadou printabil</router-link>
          </div>
        </li>
        <li class="nav-item">
          <router-link to="/pagini/cum-functioneaza">Cum funcționează</router-link>
        </li>
        <li class="nav-item">
          <button>Descoperă</button>
          <div class="nav-dropdown">
            <router-link to="/pagini/recenzii">Recenzii</router-link>
            <router-link to="/pagini/misiune">Misiune</router-link>
            <router-link to="/pagini/podcast">Podcast</router-link>
            <router-link to="/pagini/faq">Întrebări frecvente</router-link>
            <router-link to="/pagini/imagini-fundal">Imagini de fundal</router-link>
            <router-link to="/pagini/contact">Contact</router-link>
          </div>
        </li>
      </ul>

      <button class="mobile-toggle" @click="mobileOpen = true">&#9776;</button>
    </div>

    <div class="mobile-menu" :class="{ open: mobileOpen }">
      <button class="mobile-menu-close" @click="mobileOpen = false">&times;</button>
      <nav>
        <router-link to="/povesti" @click="mobileOpen = false">Povești</router-link>
        <router-link to="/pagini/cadouri" @click="mobileOpen = false">Cadouri</router-link>
        <router-link to="/pagini/cum-functioneaza" @click="mobileOpen = false">Cum funcționează</router-link>
        <router-link to="/pagini/recenzii" @click="mobileOpen = false">Recenzii</router-link>
        <router-link to="/pagini/misiune" @click="mobileOpen = false">Misiune</router-link>
        <router-link to="/pagini/faq" @click="mobileOpen = false">Întrebări frecvente</router-link>
        <router-link to="/pagini/despre-autor" @click="mobileOpen = false">Despre Autor</router-link>
        <router-link to="/pagini/contact" @click="mobileOpen = false">Contact</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
const mobileOpen = ref(false)
</script>
