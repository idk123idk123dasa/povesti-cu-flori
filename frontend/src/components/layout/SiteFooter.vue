<template>
  <footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-col">
        <h4>despre</h4>
        <router-link to="/politici/termeni">Termeni și condiții</router-link>
        <router-link to="/politici/confidentialitate">Politica de confidențialitate</router-link>
        <router-link to="/politici/returnare">Returnări și rambursări</router-link>
        <router-link to="/pagini/declinare">Declinarea responsabilității</router-link>
        <router-link to="/politici/expediere">Politica de expediere</router-link>
      </div>
      <div class="footer-col">
        <h4>colecții de povești</h4>
        <router-link to="/povesti/adelaide-magnolia">Adelaide Magnolia</router-link>
        <router-link to="/povesti/audrey-rose">Audrey Rose</router-link>
        <router-link to="/povesti/lily-clara">Lily Clara</router-link>
        <router-link to="/povesti/norah-aven">Norah Aven</router-link>
        <router-link to="/povesti/camellia-grace">Camellia Grace</router-link>
        <router-link to="/povesti/orchid-mae">Orchid Mae</router-link>
      </div>
      <div class="footer-col">
        <h4>află mai mult</h4>
        <router-link to="/pagini/faq">Întrebări frecvente</router-link>
        <router-link to="/pagini/cadou-printabil">Descarcă cadou</router-link>
        <router-link to="/pagini/contact">Contactează-ne</router-link>
        <router-link to="/pagini/recenzii">Recenzii</router-link>
      </div>
      <div class="footer-col">
        <h4>newsletter</h4>
        <p style="font-size: 14px; color: var(--color-body-text); line-height: 1.6; margin-bottom: 12px;">
          Înscrie-te pentru oferte exclusive, povești originale și evenimente.
        </p>
        <div class="newsletter-form" style="max-width: 100%;">
          <input type="email" placeholder="Adresa ta de email" />
          <button>Trimite</button>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; {{ year }} Scrisori cu Povești. Toate drepturile rezervate.
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
