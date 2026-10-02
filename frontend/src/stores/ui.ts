import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const hideAppShellHeader = ref(false)
  
  return {
    hideAppShellHeader
  }
})
