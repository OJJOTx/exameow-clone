<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useConfigStore } from '@/stores/config'
import ContentBlocks from '@/components/common/ContentBlocks.vue'
import QuestionExplanation from '@/components/common/QuestionExplanation.vue'
import {
  selectedIds,
  hasExplanation,
  headerText,
  answerText,
  explanationText,
  type Question,
  type PracticeMode
} from '@exameow/shared'
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  SparklesIcon,
  FlagIcon,
  BookmarkIcon,
  TableCellsIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  question: Question
  mode: PracticeMode
  userAnswer: string | null
  isCorrect: boolean | null
  submitted: boolean
  questionNumber: number
  totalQuestions: number
  answeredCount: number
  autoAdvancing: boolean
  wrongCount?: number
  isWrongMode?: boolean
  flashcardMode?: boolean
  aiConfigured?: boolean
  aiJudging?: boolean
  aiFeedback?: string | null
  aiJudgeError?: string | null
  aiExplaining?: boolean
  aiExplainError?: string | null
  isReported?: boolean
  isFirstQuestion: boolean
  isLastQuestion: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', answer: string | null): void
  (e: 'selfCheck', correct: boolean): void
  (e: 'select', answer: string | null): void
  (e: 'removeWrong'): void
  (e: 'aiJudge'): void
  (e: 'aiCancel'): void
  (e: 'aiExplain'): void
  (e: 'regrade', correct: boolean): void
  (e: 'report'): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'openSheet'): void
  (e: 'exit'): void
}>()

const i18n = useI18nStore()
const configStore = useConfigStore()
const router = useRouter()
import { usePracticeStore } from '@/stores/practice'
import { isTauri, isMacOS, isWindows, isLinux } from '@/utils/platform'

const practiceStore = usePracticeStore()
const isDesktopTauri = isTauri() && (isWindows() || isMacOS() || isLinux())

const timerText = ref('00:00')
let timerInterval: ReturnType<typeof setInterval>

const updateTimer = () => {
  timerText.value = practiceStore.formatTime(practiceStore.getElapsedTime())
}

const shouldShowExplanation = computed(() => {
  const mode = configStore.practiceExplanationMode || 'incorrect'
  if (mode === 'never') return false
  if (mode === 'always') return true
  if (props.isCorrect === true) return false
  if (props.isCorrect === false) return true
  return showFlashcardPreview.value
})

const answerRevealed = ref(false)

const isChoiceType = computed(() => {
  return props.question.type === 'single_choice' ||
    props.question.type === 'multiple_choice' ||
    props.question.type === 'true_false'
})

const isSelfCheckType = computed(() => {
  return props.question.type === 'fill_blank' || props.question.type === 'short_answer'
})

const showFlashcardPreview = computed(() => {
  return props.flashcardMode === true && !props.submitted
})

const interactive = computed(() => {
  return !props.submitted && !props.flashcardMode
})

const optionLabels = 'ABCDEFGH'.split('')

const correctAnswerSet = computed(() => {
  if (props.question.type === 'true_false') {
    if (props.question.correctAnswer === null) return new Set<string>()
    const a = answerText(props.question).trim()
    const isTrue = ['A', '√', '对', '正确', 'TRUE', 'T', '是', 'YES', 'Y', '1'].some(
      v => a.toUpperCase() === v.toUpperCase() || a.includes(v)
    )
    return new Set<string>(isTrue ? ['A'] : ['B'])
  }
  return new Set(Array.isArray(props.question.correctAnswer) ? props.question.correctAnswer : (props.question.correctAnswer ? [props.question.correctAnswer as string] : []))
})

const selectedSet = computed(() => {
  if (!props.userAnswer) return new Set<string>()
  return new Set(props.question.type === 'true_false' ? [props.userAnswer] : selectedIds(props.userAnswer))
})

const canSubmit = computed(() => {
  if (props.submitted) return false
  if (props.question.type === 'multiple_choice') return selectedSet.value.size > 0
  if (isChoiceType.value) return selectedSet.value.size > 0
  return false
})

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    single_choice: i18n.t('typeSingle'),
    multiple_choice: i18n.t('typeMulti'),
    true_false: i18n.t('typeTrueFalse'),
    fill_blank: i18n.t('typeFillBlank'),
    short_answer: i18n.t('typeShortAnswer'),
  }
  return labels[props.question.type] ?? props.question.type
})

const isFourImages = computed(() => {
  if (!isChoiceType.value || props.question.type === 'true_false') return false
  if (!props.question.options || props.question.options.length !== 4) return false
  
  return props.question.options.every(opt => {
    return opt.content && typeof opt.content === 'object' && opt.content.type === 'image'
  })
})

const trueFalseOptions = computed(() => {
  const locale = i18n.locale
  const trueLabel = locale === 'zh' ? '对 (True)' : locale === 'zh-TW' ? '對 (True)' : locale === 'ja' ? '正しい (True)' : locale === 'ko' ? '참 (True)' : locale === 'es' ? 'Verdadero (True)' : locale === 'fr' ? 'Vrai (True)' : locale === 'de' ? 'Richtig (True)' : locale === 'ru' ? 'Верно (True)' : 'True'
  const falseLabel = locale === 'zh' ? '错 (False)' : locale === 'zh-TW' ? '錯 (False)' : locale === 'ja' ? '誤り (False)' : locale === 'ko' ? '거짓 (False)' : locale === 'es' ? 'Falso (False)' : locale === 'fr' ? 'Faux (False)' : locale === 'de' ? 'Falsch (False)' : locale === 'ru' ? 'Неверно (False)' : 'False'
  return [
    { label: `A. ${trueLabel}`, value: 'A' },
    { label: `B. ${falseLabel}`, value: 'B' },
  ]
})

function selectOption(opt: string) {
  if (!interactive.value) return
  if (props.question.type === 'single_choice' || props.question.type === 'true_false') {
    emit('submit', props.question.type === 'true_false' ? opt : JSON.stringify([opt]))
    return
  }
  const current = new Set(selectedSet.value)
  if (current.has(opt)) {
    current.delete(opt)
  } else {
    current.add(opt)
  }
  const ans = current.size ? JSON.stringify(Array.from(current).sort()) : ''
  emit('select', ans || null)
}

function confirmMultiChoice() {
  emit('submit', props.userAnswer)
}

function clearSelection() {
  if (!interactive.value) return
  emit('select', null)
}

function handleTextInput(e: Event) {
  const val = (e.target as HTMLInputElement | HTMLTextAreaElement).value
  emit('select', val || null)
}

function handleSelfCheck(correct: boolean) {
  if (props.submitted) return
  emit('selfCheck', correct)
}

// Keydown listener for shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return

  const activeTag = document.activeElement?.tagName.toLowerCase()
  const isInputActive = activeTag === 'input' || activeTag === 'textarea'

  if (!isInputActive) {
    if (e.key === 'ArrowLeft') {
      if (!props.isFirstQuestion) emit('prev')
      return
    } else if (e.key === 'ArrowRight') {
      if (!props.autoAdvancing) emit('next')
      return
    }
  }

  if (!interactive.value || !isChoiceType.value) {
    if (e.key === 'Enter' && canSubmit.value && interactive.value) {
      confirmMultiChoice()
    }
    return
  }
  const num = parseInt(e.key)
  if (!isNaN(num) && num >= 1 && num <= optionLabels.length) {
    const opts = props.question.type === 'true_false' ? trueFalseOptions.value : props.question.options
    if (opts[num - 1]) {
      const val = props.question.type === 'true_false' ? trueFalseOptions.value[num - 1].value : props.question.options[num - 1].id
      selectOption(val)
    }
  } else if (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].includes(e.key.toLowerCase())) {
    const idx = e.key.toLowerCase().charCodeAt(0) - 97
    const opts = props.question.type === 'true_false' ? trueFalseOptions.value : props.question.options
    if (opts[idx]) {
      const val = props.question.type === 'true_false' ? trueFalseOptions.value[idx].value : props.question.options[idx].id
      selectOption(val)
    }
  } else if (e.key === 'Enter' && props.question.type === 'multiple_choice' && canSubmit.value) {
    confirmMultiChoice()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearInterval(timerInterval)
})

</script>

<template>
  <div class="fixed inset-x-0 bottom-0 flex flex-col bg-[#111116] text-[#E2E2E2] overflow-hidden z-30" :style="{ top: isDesktopTauri ? '38px' : '0px' }">
    <!-- Top Header -->
    <header class="h-14 flex items-center px-4 border-b border-[#28282D] shrink-0 justify-between">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2 text-white font-bold cursor-pointer" @click="emit('exit')">
          <span class="text-xl">🐾</span> Exameow
        </div>
        <div class="hidden md:flex items-center gap-4 text-sm font-medium text-[#8F8F96]">
          <span class="text-white border-b-2 border-white pb-1 mt-1 cursor-pointer">Practice</span>
          <span class="cursor-pointer hover:text-white transition-colors">Exam</span>
          <span class="cursor-pointer hover:text-white transition-colors">Flashcard</span>
        </div>
      </div>
      
      <div class="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div class="text-sm font-bold text-white mb-1">Question {{ questionNumber }} of {{ totalQuestions }}</div>
        <div class="w-48 h-1 bg-[#28282D] rounded-full overflow-hidden">
          <div class="h-full bg-[#4169E1] transition-all duration-300" :style="{ width: `${(answeredCount / totalQuestions) * 100}%` }"></div>
        </div>
      </div>
      
      <div class="flex items-center gap-4 text-[#8F8F96]">
        <button class="hover:text-white transition-colors" @click="emit('report')">
          <BookmarkIcon class="w-5 h-5" :class="{'fill-current text-[#E05642]': isReported}" />
        </button>
        <button class="hover:text-white transition-colors" @click="emit('openSheet')">
          <TableCellsIcon class="w-5 h-5" />
        </button>
        <div class="flex items-center gap-1.5 text-sm font-medium">
          <ClockIcon class="w-4 h-4" />
          {{ timerText }}
        </div>
        <button class="ml-2 px-3 py-1.5 bg-[#E05642]/10 text-[#E05642] text-sm font-semibold rounded-md hover:bg-[#E05642]/20 transition-colors" @click="emit('exit')">
          End Session
        </button>
      </div>
    </header>

    <!-- Main Content Split -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left Panel: Question Stem -->
      <div class="w-1/2 border-r border-[#28282D] flex flex-col p-6 overflow-y-auto custom-scrollbar">
        <div class="flex items-center gap-3 mb-6">
          <div class="px-3 py-1 bg-[#28282D] text-white text-xs font-bold rounded-full">
            Question {{ questionNumber.toString().padStart(2, '0') }}
          </div>
          <div class="text-xs font-bold text-[#8F8F96]">{{ typeLabel }}</div>
          <div class="text-xs text-[#8F8F96] ml-auto">Cell Biology - Section 2.4</div>
        </div>
        
        <div class="text-lg font-bold text-white mb-6 leading-relaxed">
          <ContentBlocks :blocks="question.questionHeader" />
        </div>
        
        <div v-if="submitted && isCorrect !== null" class="mt-4 p-4 rounded-xl" :class="isCorrect ? 'bg-[rgb(76,175,80)]/10 border border-[rgb(76,175,80)]/20' : 'bg-[#E05642]/10 border border-[#E05642]/20'">
           <div class="flex items-center gap-2 mb-2 font-bold" :class="isCorrect ? 'text-[rgb(76,175,80)]' : 'text-[#E05642]'">
             <CheckCircleIcon v-if="isCorrect" class="w-5 h-5" />
             <XCircleIcon v-else class="w-5 h-5" />
             {{ isCorrect ? 'Correct' : 'Incorrect' }}
           </div>
           <div v-if="shouldShowExplanation && hasExplanation(question)" class="text-sm text-[#E2E2E2]">
             <QuestionExplanation :question="question" />
           </div>
        </div>
      </div>

      <!-- Right Panel: Options -->
      <div class="w-1/2 flex flex-col p-6 overflow-y-auto custom-scrollbar relative">
        <div class="flex items-center justify-between mb-6">
          <div class="text-base font-bold text-white">Choose your answer <span class="text-[#8F8F96] font-normal text-sm ml-1">(Select {{ question.type === 'multiple_choice' ? 'multiple' : '1' }} of {{ isChoiceType ? (question.type === 'true_false' ? 2 : question.options.length) : 'input' }})</span></div>
          <div class="text-xs text-[#8F8F96]">Shortcuts: [A-D]</div>
        </div>
        
        <div v-if="isChoiceType" class="flex-1" :class="isFourImages ? 'grid grid-cols-2 gap-4' : 'space-y-3'">
          <template v-if="question.type === 'true_false'">
            <button
              v-for="(opt, idx) in trueFalseOptions"
              :key="opt.value"
              class="w-full text-left p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all duration-200"
              :class="[
                selectedSet.has(opt.value) 
                  ? 'border-[#4169E1] bg-[#4169E1]/10' 
                  : 'border-[#28282D] bg-transparent hover:border-[#4F4F56]',
                submitted && correctAnswerSet.has(opt.value) ? '!border-[rgb(76,175,80)] !bg-[rgb(76,175,80)]/10' : '',
                submitted && !correctAnswerSet.has(opt.value) && selectedSet.has(opt.value) ? '!border-[#E05642] !bg-[#E05642]/10' : '',
              ]"
              :disabled="!interactive"
              @click="selectOption(opt.value)"
            >
              <div class="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors text-sm font-bold"
                   :class="selectedSet.has(opt.value) ? 'border-[#4169E1] bg-[#4169E1] text-[#111116]' : 'border-[#4F4F56] text-white bg-transparent'">
                {{ optionLabels[idx] }}
              </div>
              <div class="text-[15px] font-medium flex-1" :class="selectedSet.has(opt.value) ? 'text-white' : 'text-[#E2E2E2]'">
                 {{ opt.label.replace(/^[A-Z]\.\s*/, '') }}
              </div>
            </button>
          </template>
          <template v-else>
            <button
              v-for="(opt, idx) in question.options"
              :key="opt.id"
              class="w-full text-left p-4 rounded-xl border cursor-pointer transition-all duration-200"
              :class="[
                isFourImages ? 'flex flex-col gap-3 aspect-square' : 'flex items-center gap-4',
                selectedSet.has(opt.id) 
                  ? 'border-[#4169E1] bg-[#4169E1]/10' 
                  : 'border-[#28282D] bg-transparent hover:border-[#4F4F56]',
                submitted && correctAnswerSet.has(opt.id) ? '!border-[rgb(76,175,80)] !bg-[rgb(76,175,80)]/10' : '',
                submitted && !correctAnswerSet.has(opt.id) && selectedSet.has(opt.id) ? '!border-[#E05642] !bg-[#E05642]/10' : '',
              ]"
              :disabled="!interactive"
              @click="selectOption(opt.id)"
            >
              <template v-if="isFourImages">
                 <div class="flex items-center justify-start w-full">
                   <div class="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors text-sm font-bold"
                        :class="selectedSet.has(opt.id) ? 'border-[#4169E1] bg-[#4169E1] text-[#111116]' : 'border-[#4F4F56] text-white bg-transparent'">
                     {{ optionLabels[idx] }}
                   </div>
                 </div>
                 <div class="flex-1 w-full flex items-center justify-center bg-white/5 rounded-lg overflow-hidden relative p-2 grid-option-image">
                   <ContentBlocks :blocks="[opt.content]" />
                 </div>
              </template>
              <template v-else>
                <div class="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors text-sm font-bold"
                     :class="selectedSet.has(opt.id) ? 'border-[#4169E1] bg-[#4169E1] text-[#111116]' : 'border-[#4F4F56] text-white bg-transparent'">
                  {{ optionLabels[idx] }}
                </div>
                <div class="text-[15px] font-medium flex-1" :class="selectedSet.has(opt.id) ? 'text-white' : 'text-[#E2E2E2]'">
                  <ContentBlocks :blocks="[opt.content]" />
                </div>
              </template>
            </button>
          </template>
        </div>
        
        <div v-if="isSelfCheckType" class="flex-1">
          <textarea
            v-if="question.type === 'short_answer'"
            class="w-full bg-[#1A1A21] border border-[#28282D] rounded-xl p-4 text-[#E2E2E2] min-h-[150px] outline-none focus:border-[#4169E1] transition-colors resize-none"
            :value="userAnswer ?? ''"
            :placeholder="i18n.t('practiceInputAnswer')"
            :disabled="!interactive"
            @input="handleTextInput"
          ></textarea>
          <input
            v-else
            class="w-full bg-[#1A1A21] border border-[#28282D] rounded-xl p-4 text-[#E2E2E2] outline-none focus:border-[#4169E1] transition-colors"
            :value="userAnswer ?? ''"
            :placeholder="i18n.t('practiceInputAnswerShort')"
            :disabled="!interactive"
            @input="handleTextInput"
          />
        </div>
        
        <div class="mt-auto pt-6 flex items-center justify-between" v-if="interactive">
          <button class="text-sm font-semibold text-[#8F8F96] hover:text-white transition-colors flex items-center gap-1.5" @click="clearSelection">
            <XMarkIcon class="w-4 h-4" />
            Clear Selection
          </button>
          
          <button 
            v-if="question.type === 'multiple_choice' || isSelfCheckType"
            class="px-6 py-2.5 bg-[#4169E1] text-white text-sm font-bold rounded-xl hover:bg-[#3156C4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="!canSubmit && isChoiceType"
            @click="confirmMultiChoice"
          >
            Check Answer <CheckCircleIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation -->
    <footer class="h-16 flex items-center px-6 border-t border-[#28282D] shrink-0 justify-between bg-[#111116]">
      <div class="flex items-center gap-6">
        <button 
          class="flex items-center gap-2 text-sm font-bold transition-colors"
          :class="isFirstQuestion ? 'text-[#4F4F56] cursor-not-allowed' : 'text-[#8F8F96] hover:text-white'"
          :disabled="isFirstQuestion"
          @click="emit('prev')"
        >
          <ArrowLeftIcon class="w-4 h-4" /> Previous Question
        </button>
        <button class="flex items-center gap-2 text-sm font-bold transition-colors"
                :class="isReported ? 'text-[#E05642]' : 'text-[#8F8F96] hover:text-white'"
                @click="emit('report')">
          <span class="w-5 h-5 rounded flex items-center justify-center text-xs"
                :class="isReported ? 'bg-[#E05642]/20 text-[#E05642]' : 'bg-[#28282D]'">P</span> Mark for Review
        </button>
        <div class="hidden lg:block text-xs font-medium text-[#4F4F56]">
          Shortcuts: <span class="text-[#8F8F96]">[1-4]</span> select <span class="text-[#8F8F96]">[Enter]</span> Confirm
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <button 
          class="flex items-center gap-2 text-sm font-bold transition-colors"
          :class="[isLastQuestion ? 'text-[#4169E1] hover:text-[#5A85FF]' : 'text-white hover:text-[#E2E2E2]', autoAdvancing ? 'opacity-50 cursor-not-allowed' : '']"
          @click="emit('next')"
          :disabled="autoAdvancing"
        >
          {{ isLastQuestion ? 'Submit Exam' : 'Next Question' }} <ArrowRightIcon class="w-4 h-4" />
        </button>
        <button class="px-4 py-2 bg-[#28282D] text-[#8F8F96] text-sm font-bold rounded-lg hover:bg-[#323238] hover:text-white transition-colors" @click="emit('openSheet')">
          Summary
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #28282D;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4F4F56;
}
</style>
<style scoped>
.grid-option-image :deep(img) {
  margin: 0 !important;
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}
</style>
