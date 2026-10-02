<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import type { LocaleMessages } from '@/i18n/locales'
import type { Question, ContentBlock, QuestionOption, QuestionType, Difficulty, QuestionExplanation } from '@exameow/shared'
import ContentBlocks from '@/components/common/ContentBlocks.vue'
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  question: Question
  bankId: string
}>()

const emit = defineEmits<{
  (e: 'save', question: Question): void
  (e: 'cancel'): void
}>()

const i18n = useI18nStore()

// Deep clone the question for editing
const editType = ref<QuestionType>(props.question.type)
const editDifficulty = ref<Difficulty | undefined>(props.question.difficulty)
const editSubject = ref(props.question.subject || '')
const editChapter = ref(props.question.chapter || '')

// Stem blocks — convert to editable text entries
const editStemBlocks = ref<{ type: 'text' | 'image'; content: string; format?: 'plain' | 'html' }[]>(
  props.question.questionHeader.map(b => ({ ...b }))
)

// Options
const editOptions = ref<{ id: string; content: string }[]>(
  props.question.options.map(o => ({
    id: o.id,
    content: o.content.type === 'text' ? o.content.content : o.content.content,
  }))
)

// Correct answer
const editCorrectIds = ref<string[]>(
  Array.isArray(props.question.correctAnswer)
    ? [...props.question.correctAnswer]
    : props.question.correctAnswer
      ? [props.question.correctAnswer]
      : []
)

// For fill_blank / short_answer: raw text answer
const editCorrectText = ref<string>(
  !Array.isArray(props.question.correctAnswer) && props.question.correctAnswer
    ? props.question.correctAnswer
    : ''
)

// Explanation
const editExplanation = ref<string>(
  props.question.explanation?.general
    ?.map(b => b.type === 'text' ? b.content : '')
    .join('\n') || ''
)

const questionTypes: { value: QuestionType; labelKey: keyof LocaleMessages }[] = [
  { value: 'single_choice' as QuestionType, labelKey: 'typeSingle' },
  { value: 'multiple_choice' as QuestionType, labelKey: 'typeMulti' },
  { value: 'true_false' as QuestionType, labelKey: 'typeTrueFalse' },
  { value: 'fill_blank' as QuestionType, labelKey: 'typeFillBlank' },
  { value: 'short_answer' as QuestionType, labelKey: 'typeShortAnswer' },
]

const difficulties: { value: Difficulty; labelKey: keyof LocaleMessages }[] = [
  { value: 'easy' as Difficulty, labelKey: 'diffEasy' },
  { value: 'medium' as Difficulty, labelKey: 'diffMedium' },
  { value: 'hard' as Difficulty, labelKey: 'diffHard' },
]

const isChoiceType = computed(() =>
  editType.value === 'single_choice' ||
  editType.value === 'multiple_choice' ||
  editType.value === 'true_false'
)

const isMultiChoice = computed(() => editType.value === 'multiple_choice')

function toggleCorrect(optionId: string) {
  if (isMultiChoice.value) {
    const idx = editCorrectIds.value.indexOf(optionId)
    if (idx >= 0) {
      editCorrectIds.value.splice(idx, 1)
    } else {
      editCorrectIds.value.push(optionId)
    }
  } else {
    editCorrectIds.value = [optionId]
  }
}

function addOption() {
  const nextId = String.fromCharCode(97 + editOptions.value.length) // a, b, c, d...
  editOptions.value.push({ id: nextId, content: '' })
}

function removeOption(index: number) {
  const removed = editOptions.value[index]
  if (removed) {
    editCorrectIds.value = editCorrectIds.value.filter(id => id !== removed.id)
  }
  editOptions.value.splice(index, 1)
}

function updateStemText(index: number, value: string) {
  const block = editStemBlocks.value[index]
  if (block && block.type === 'text') {
    block.content = value
  }
}

function removeStemBlock(index: number) {
  editStemBlocks.value.splice(index, 1)
}

function addStemTextBlock() {
  editStemBlocks.value.push({ type: 'text', content: '' })
}

function buildQuestion(): Question {
  const questionHeader: ContentBlock[] = editStemBlocks.value
    .filter(b => b.content.trim() || b.type === 'image')
    .map(b => {
      if (b.type === 'image') return { type: 'image' as const, content: b.content }
      return { type: 'text' as const, content: b.content }
    })

  const options: QuestionOption[] = editOptions.value.map(o => ({
    id: o.id,
    content: { type: 'text' as const, content: o.content },
  }))

  let correctAnswer: string[] | string | null
  if (isChoiceType.value) {
    correctAnswer = editCorrectIds.value.length > 0 ? [...editCorrectIds.value] : null
  } else {
    correctAnswer = editCorrectText.value.trim() || null
  }

  const explanation: QuestionExplanation = {
    general: editExplanation.value.trim()
      ? [{ type: 'text' as const, content: editExplanation.value.trim() }]
      : [],
    byOptionId: props.question.explanation?.byOptionId || {},
  }

  return {
    ...props.question,
    type: editType.value,
    questionHeader,
    options,
    correctAnswer,
    explanation,
    difficulty: editDifficulty.value,
    subject: editSubject.value.trim() || undefined,
    chapter: editChapter.value.trim() || undefined,
  }
}

function handleSave() {
  emit('save', buildQuestion())
}

function optionLabel(index: number): string {
  return String.fromCharCode(65 + index) // A, B, C, D...
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style="background-color: rgba(0,0,0,0.5)" @click.self="emit('cancel')">
    <div class="w-full max-w-2xl my-4 mx-4 sm:my-8">
      <!-- Header -->
      <div class="card-elevated rounded-t-3xl rounded-b-none px-5 py-4 flex items-center justify-between sticky top-0 z-10" style="border-bottom: 1px solid rgb(var(--md-outline-variant))">
        <h2 class="text-title-md font-bold" style="color: rgb(var(--md-on-surface))">{{ i18n.t('editorTitle') }}</h2>
        <div class="flex items-center gap-2">
          <button class="btn-tonal !h-9 !px-4 !text-sm" @click="emit('cancel')">
            {{ i18n.t('editorCancelBtn') }}
          </button>
          <button class="btn-filled !h-9 !px-4 !text-sm" @click="handleSave">
            <CheckIcon class="w-4 h-4" />
            {{ i18n.t('editorSaveBtn') }}
          </button>
        </div>
      </div>

      <!-- Editor Blocks -->
      <div class="card-elevated rounded-t-none rounded-b-3xl p-5 space-y-4">

        <!-- Block: Question Type -->
        <div class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorTypeLabel') }}</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="qt in questionTypes"
              :key="qt.value"
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              :style="{
                backgroundColor: editType === qt.value ? 'rgb(var(--md-primary))' : 'rgb(var(--md-surface-container-high))',
                color: editType === qt.value ? 'rgb(var(--md-on-primary))' : 'rgb(var(--md-on-surface-variant))',
              }"
              @click="editType = qt.value"
            >
              {{ i18n.t(qt.labelKey) }}
            </button>
          </div>
        </div>

        <!-- Block: Question Stem -->
        <div class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorStemLabel') }}</div>
          <div class="space-y-2">
            <div v-for="(block, idx) in editStemBlocks" :key="idx" class="relative group">
              <template v-if="block.type === 'text'">
                <textarea
                  :value="block.content"
                  @input="updateStemText(idx, ($event.target as HTMLTextAreaElement).value)"
                  class="editor-textarea"
                  rows="3"
                  placeholder="Enter question text..."
                />
              </template>
              <template v-else-if="block.type === 'image'">
                <div class="relative inline-block">
                  <img :src="block.content" alt="Question image" class="max-w-full h-auto rounded-lg max-h-60" />
                </div>
              </template>
              <button
                v-if="editStemBlocks.length > 1"
                class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
                @click="removeStemBlock(idx)"
              >
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              class="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
              style="color: rgb(var(--md-primary)); background-color: rgb(var(--md-primary) / 0.08)"
              @click="addStemTextBlock"
            >
              <PlusIcon class="w-3.5 h-3.5" /> Add text block
            </button>
          </div>
        </div>

        <!-- Block: Options (for choice types) -->
        <div v-if="isChoiceType" class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorOptionsLabel') }}</div>
          <div class="space-y-2">
            <div
              v-for="(opt, idx) in editOptions"
              :key="opt.id"
              class="flex items-start gap-2 group"
            >
              <!-- Correct answer toggle -->
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all duration-200 font-bold text-xs"
                :style="{
                  backgroundColor: editCorrectIds.includes(opt.id)
                    ? 'rgb(var(--md-primary))'
                    : 'rgb(var(--md-surface-container-high))',
                  color: editCorrectIds.includes(opt.id)
                    ? 'rgb(var(--md-on-primary))'
                    : 'rgb(var(--md-on-surface-variant))',
                  boxShadow: editCorrectIds.includes(opt.id) ? '0 2px 8px rgb(var(--md-primary) / 0.3)' : 'none',
                }"
                :title="editCorrectIds.includes(opt.id) ? 'Correct answer' : 'Click to mark as correct'"
                @click="toggleCorrect(opt.id)"
              >
                <CheckIcon v-if="editCorrectIds.includes(opt.id)" class="w-4 h-4" />
                <span v-else>{{ optionLabel(idx) }}</span>
              </button>

              <!-- Option text -->
              <input
                v-model="editOptions[idx]!.content"
                class="editor-input flex-1"
                :placeholder="`Option ${optionLabel(idx)}...`"
              />

              <!-- Remove option -->
              <button
                v-if="editOptions.length > 2"
                class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style="color: rgb(var(--md-error))"
                @click="removeOption(idx)"
              >
                <TrashIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            class="mt-2 text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
            style="color: rgb(var(--md-primary)); background-color: rgb(var(--md-primary) / 0.08)"
            @click="addOption"
          >
            <PlusIcon class="w-3.5 h-3.5" /> {{ i18n.t('editorAddOption') }}
          </button>

          <!-- Correct answer summary -->
          <div class="mt-3 text-xs px-3 py-2 rounded-lg" style="background-color: rgb(var(--md-primary) / 0.08); color: rgb(var(--md-primary))">
            <span class="font-semibold">{{ i18n.t('editorCorrectLabel') }}:</span>
            <span v-if="editCorrectIds.length > 0" class="ml-1">
              {{ editCorrectIds.map(id => {
                const idx = editOptions.findIndex(o => o.id === id)
                return idx >= 0 ? optionLabel(idx) : id
              }).join(', ') }}
            </span>
            <span v-else class="ml-1 opacity-60">—</span>
          </div>
        </div>

        <!-- Block: Correct Answer (for fill_blank / short_answer) -->
        <div v-else class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorCorrectLabel') }}</div>
          <textarea
            v-model="editCorrectText"
            class="editor-textarea"
            rows="2"
            placeholder="Enter correct answer..."
          />
        </div>

        <!-- Block: Explanation -->
        <div class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorExplanationLabel') }}</div>
          <textarea
            v-model="editExplanation"
            class="editor-textarea"
            rows="3"
            placeholder="Enter explanation (optional)..."
          />
        </div>

        <!-- Block: Difficulty -->
        <div class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorDifficultyLabel') }}</div>
          <div class="flex gap-2">
            <button
              v-for="d in difficulties"
              :key="d.value"
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              :style="{
                backgroundColor: editDifficulty === d.value ? 'rgb(var(--md-tertiary))' : 'rgb(var(--md-surface-container-high))',
                color: editDifficulty === d.value ? 'rgb(var(--md-on-tertiary))' : 'rgb(var(--md-on-surface-variant))',
              }"
              @click="editDifficulty = d.value"
            >
              {{ i18n.t(d.labelKey) }}
            </button>
          </div>
        </div>

        <!-- Block: Subject / Chapter -->
        <div class="editor-block">
          <div class="editor-block-label">{{ i18n.t('editorSubjectLabel') }} / {{ i18n.t('editorChapterLabel') }}</div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs mb-1 block" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('editorSubjectLabel') }}</label>
              <input v-model="editSubject" class="editor-input" :placeholder="i18n.t('editorSubjectLabel')" />
            </div>
            <div>
              <label class="text-xs mb-1 block" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('editorChapterLabel') }}</label>
              <input v-model="editChapter" class="editor-input" :placeholder="i18n.t('editorChapterLabel')" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-block {
  padding: 1rem;
  border-radius: 1rem;
  background-color: rgb(var(--md-surface-container));
  border: 1px solid rgb(var(--md-outline-variant) / 0.5);
  transition: border-color 0.2s;
}
.editor-block:focus-within {
  border-color: rgb(var(--md-primary) / 0.5);
}
.editor-block-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--md-primary));
  margin-bottom: 0.5rem;
}
.editor-textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid rgb(var(--md-outline-variant));
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: rgb(var(--md-surface-container-lowest));
  color: rgb(var(--md-on-surface));
  transition: border-color 0.2s;
  font-family: inherit;
}
.editor-textarea:focus {
  outline: none;
  border-color: rgb(var(--md-primary));
  box-shadow: 0 0 0 2px rgb(var(--md-primary) / 0.15);
}
.editor-input {
  width: 100%;
  border: 1px solid rgb(var(--md-outline-variant));
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background-color: rgb(var(--md-surface-container-lowest));
  color: rgb(var(--md-on-surface));
  transition: border-color 0.2s;
}
.editor-input:focus {
  outline: none;
  border-color: rgb(var(--md-primary));
  box-shadow: 0 0 0 2px rgb(var(--md-primary) / 0.15);
}
</style>
