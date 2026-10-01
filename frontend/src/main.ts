import { initializeQuestionStorage } from '@/utils/questionStorage'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import './assets/fonts.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
window.addEventListener('question-storage-error', () => {
  let banner = document.getElementById('storage-error')
  if (!banner) { banner = document.createElement('div'); banner.id = 'storage-error'; document.body.prepend(banner) }
  banner.textContent = 'Unable to save question data. Export your bank as JSON before closing this tab.'
  banner.setAttribute('role', 'alert')
})
initializeQuestionStorage().then(() => app.mount('#app')).catch(error => {
  const root = document.getElementById('app')!
  root.textContent = `Unable to load question data: ${String(error)}. Your previous data has been preserved.`
})
