import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi.js'

export const useSiteStore = defineStore('site', () => {
  const siteData = ref(null)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    const { fetchData } = useApi()
    siteData.value = await fetchData('site')
    loaded.value = true
  }

  return { siteData, loaded, load }
})
