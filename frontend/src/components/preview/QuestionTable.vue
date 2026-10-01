<script setup lang="ts">
import ContentBlocks from '@/components/common/ContentBlocks.vue'
import QuestionExplanation from '@/components/common/QuestionExplanation.vue'
import { headerText, answerText, explanationText, blockText } from '@exameow/shared'

import { computed } from 'vue'
import type { Question } from '@exameow/shared'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const props = defineProps<{ questions: Question[] }>()

const typeLabel: Record<string, string> = {
  single_choice: 'typeSingle', multiple_choice: 'typeMulti',
  true_false: 'typeTrueFalse', fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

const typeColor: Record<string, string> = {
  single_choice: 'rgb(var(--md-primary))',
  multiple_choice: 'rgb(var(--md-tertiary))',
  true_false: '#B06A00',
  fill_blank: '#1B6D3C',
  short_answer: '#A8365A',
}

const typeBg: Record<string, string> = {
  single_choice: 'rgba(var(--md-primary) / 0.12)',
  multiple_choice: 'rgba(var(--md-tertiary) / 0.12)',
  true_false: 'rgba(176,106,0 / 0.12)',
  fill_blank: 'rgba(27,109,60 / 0.12)',
  short_answer: 'rgba(168,54,90 / 0.12)',
}

const rows = computed(() =>
  props.questions.map((q, i) => ({
    question: q,
    id: q.id || `${i + 1}`,
    qtype: q.type,
    stem: headerText(q),
    options: q.options.map(o => blockText(o.content)).join(' · '),
    answer: answerText(q),
    analysis: explanationText(q),
  })),
)
</script>

<template>
  <div class="rounded-[24px] sm:rounded-[28px] overflow-hidden elevation-1"
       :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }">
    <div class="overflow-x-auto -mx-0" style="-webkit-overflow-scrolling: touch;">
      <table class="w-full text-sm min-w-[560px] sm:min-w-0 table-fixed">
        <thead>
          <tr :style="{ borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.3)' }">
            <th class="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-label-sm w-8 sm:w-10" style="color: rgb(var(--md-on-surface-variant))">#</th>
            <th class="text-left px-1 sm:px-5 py-2.5 sm:py-3.5 text-label-sm w-[84px] sm:w-24 whitespace-nowrap" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableType') }}</th>
            <th class="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableQuestion') }}</th>
            <th class="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-label-sm w-[45%] sm:w-auto hidden sm:table-cell" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableOptions') }}</th>
            <th class="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-label-sm w-24 sm:w-28 whitespace-nowrap" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnswer') }}</th>
            <th class="text-left px-3 sm:px-5 py-2.5 sm:py-3.5 text-label-sm w-32 sm:w-44 hidden sm:table-cell" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnalysis') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row.id"
            class="transition-colors duration-150 align-top"
            :style="{ borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.12)' }"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--md-surface-container-highest))' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }"
          >
            <td class="px-3 sm:px-5 py-2 sm:py-3 text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ idx + 1 }}</td>
            <td class="px-1 sm:px-5 py-2 sm:py-3 whitespace-nowrap">
              <span
                class="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                :style="{ backgroundColor: typeBg[row.qtype] || 'rgba(var(--md-on-surface-variant) / 0.12)', color: typeColor[row.qtype] || 'rgb(var(--md-on-surface-variant))' }"
              >
                {{ i18n.t((typeLabel[row.qtype] || row.qtype) as any) }}
              </span>
            </td>
            <td class="px-3 sm:px-5 py-2 sm:py-3 font-medium" style="color: rgb(var(--md-on-surface))">
              <div class="line-clamp-3"><ContentBlocks :blocks="row.question.questionHeader" /></div>
            </td>
            <td class="px-3 sm:px-5 py-2 sm:py-3 text-body-sm hidden sm:table-cell" style="color: rgb(var(--md-on-surface-variant))">
              <div class="line-clamp-2"><span v-for="option in row.question.options" :key="option.id" class="block"><ContentBlocks :blocks="[option.content]" /></span></div>
            </td>
            <td class="px-3 sm:px-5 py-2 sm:py-3 font-semibold whitespace-nowrap" style="color: #1B6D3C">{{ row.answer }}</td>
            <td class="px-3 sm:px-5 py-2 sm:py-3 text-body-sm hidden sm:table-cell" style="color: rgb(var(--md-on-surface-variant))">
              <div class="line-clamp-2"><QuestionExplanation :question="row.question" /></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
