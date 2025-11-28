<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isVisible = ref(true)

// Update body class on mount
onMounted(() => {
  updateBodyClass(true)
})

// Watch visibility changes to update body class
watch(isVisible, (newValue) => {
  updateBodyClass(newValue)
})

function updateBodyClass(visible: boolean) {
  if (visible) {
    document.documentElement.classList.add('has-top-banner')
  }
  else {
    document.documentElement.classList.remove('has-top-banner')
  }
}

function closeBanner() {
  isVisible.value = false
}

// Get content based on language
const bannerContent = {
  'zh-CN': {
    text: '🚀 GLM-4.6 代码编程专享计划',
    linkText: '黑五特惠折上折 ➞',
    linkUrl: 'https://www.bigmodel.cn/claude-code?ic=RRVJPB5SII',
  },
  'en': {
    text: '🚀 GLM-4.6 Code Programming Exclusive Plan',
    linkText: 'Black Friday Special Discount ➞',
    linkUrl: 'https://z.ai/subscribe?ic=8JVLJQFSKB',
  },
  'ja-JP': {
    text: '🚀 GLM-4.6コードプログラミング専享プラン',
    linkText: 'ブラックフライデー特別割引 ➞',
    linkUrl: 'https://z.ai/subscribe?ic=8JVLJQFSKB',
  },
}

// Reactive content based on current language
const content = computed(() => {
  const currentLang = lang.value === 'zh-CN' ? 'zh-CN' : lang.value === 'ja-JP' ? 'ja-JP' : 'en'
  return bannerContent[currentLang]
})

// Computed close button aria-label
const closeLabel = computed(() => {
  return lang.value === 'zh-CN' ? '关闭' : lang.value === 'ja-JP' ? '閉じる' : 'Close'
})
</script>

<template>
  <div v-if="isVisible" class="fixed top-0 left-0 right-0 z-200 bg-[#EAEBFE] dark:bg-[#1a1a2e] text-gray-800 dark:text-white/90 px-4 h-10 flex items-center justify-center text-sm font-medium <sm:text-xs">
    <div class="max-w-screen-xl w-full mx-auto flex items-center justify-center gap-4 relative">
      <p class="m-0 text-center leading-relaxed absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pr-8 <sm:pr-6 <sm:max-w-[calc(100%-3rem)]">
        <strong class="text-gray-900 dark:text-white">{{ content.text }}</strong> • <a :href="content.linkUrl" target="_blank" rel="noopener noreferrer" class="text-gray-800 dark:text-white/90 underline underline-offset-2 transition-colors hover:text-gray-900 dark:hover:text-white">{{ content.linkText }}</a>
      </p>
      <button class="bg-transparent border-none text-gray-600 dark:text-white/70 cursor-pointer p-1 flex items-center justify-center transition-colors hover:text-gray-900 dark:hover:text-white absolute right-0 shrink-0 z-10" @click="closeBanner" :aria-label="closeLabel">
        <div class="i-carbon-close w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
