<script setup lang="ts">
import type { Question } from '@exameow/shared'
import ContentBlocks from './ContentBlocks.vue'
defineProps<{ question: Question }>()
</script>
<template>
  <span>
    <ContentBlocks :blocks="question.explanation.general" />
    <span v-for="(option, index) in question.options" :key="option.id" class="block">
      <template v-if="question.explanation.byOptionId[option.id]?.length">
        <strong>{{ String.fromCharCode(65 + index) }}.</strong>
        <ContentBlocks :blocks="question.explanation.byOptionId[option.id]!" />
      </template>
    </span>
  </span>
</template>
