<script setup lang="ts">
import type { ContentBlock } from '@exameow/shared'
import { safeHtml } from '@/utils/contentHtml'
defineProps<{ blocks: ContentBlock[] }>()
</script>

<template>
  <span class="content-blocks">
    <template v-for="(block, index) in blocks" :key="index">
      <img v-if="block.type === 'image'" :src="block.content" alt="Question diagram" class="my-3 block max-w-full h-auto rounded-lg" loading="lazy" />
      <span v-else-if="block.format === 'html'" class="block whitespace-pre-wrap" v-html="safeHtml(block.content)" />
      <span v-else class="block whitespace-pre-wrap">{{ block.content }}</span>
    </template>
  </span>
</template>
