import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import 'uno.css'
import '@unocss/reset/tailwind.css'

export default {
  extends: DefaultTheme,
} satisfies Theme
