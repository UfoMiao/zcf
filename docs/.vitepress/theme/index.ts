import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import TopBanner from './components/TopBanner.vue'

import 'uno.css'
import '@unocss/reset/tailwind.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(TopBanner),
    })
  },
} satisfies Theme
