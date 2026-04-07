import { ref } from 'vue'

const cache = new Map()

export function useApi() {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchData(path) {
    if (cache.has(path)) {
      data.value = cache.get(path)
      return data.value
    }

    loading.value = true
    error.value = null

    try {
      const res = await fetch(`/api/${path}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      cache.set(path, json)
      data.value = json
      return json
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchData }
}
