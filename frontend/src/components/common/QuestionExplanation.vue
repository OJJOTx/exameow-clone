<script setup lang="ts">
import type { Question } from '@exameow/shared'
import ContentBlocks from './ContentBlocks.vue'
defineProps<{ question: Question }>()
</script>
<template>
  <div class="flex flex-col gap-2 mt-1">
    <div v-if="question.explanation.general?.length">
      <ContentBlocks :blocks="question.explanation.general" />
    </div>
    <div v-for="(option, index) in question.options" :key="option.id">
      <template v-if="question.explanation.byOptionId[option.id]?.length">
        <div class="font-bold flex gap-1 mb-1 items-start">
          <span class="shrink-0">{{ String.fromCharCode(65 + index) }}.</span>
          <ContentBlocks :blocks="[option.content]" class="flex-1" />
        </div>
        <ContentBlocks :blocks="question.explanation.byOptionId[option.id]!" />
      </template>
    </div>
  </div>
</template>
