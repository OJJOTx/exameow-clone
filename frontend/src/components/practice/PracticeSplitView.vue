<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Question, PracticeMode } from '@exameow/shared'
import ContentBlocks from '@/components/common/ContentBlocks.vue'
import { headerText, answerText } from '@exameow/shared'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  question: Question
  mode: PracticeMode
  userAnswer: string | null
  isCorrect: boolean | null
  submitted: boolean
  questionNumber: number
  totalQuestions: number
  autoAdvancing: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', answer: string | null): void
  (e: 'select', answer: string | null): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'submitAll'): void
  (e: 'back'): void
}>()

const showPalette = ref(false)
const optionLabels = 'ABCDEFGH'.split('')

function selectOption(optId: string) {
  if (props.submitted) return
  if (props.question.type === 'single_choice' || props.question.type === 'true_false') {
    emit('submit', JSON.stringify([optId]))
  } else {
    const cur = new Set(props.userAnswer ? JSON.parse(props.userAnswer) : [])
    if (cur.has(optId)) cur.delete(optId)
    else cur.add(optId)
    emit('select', cur.size ? JSON.stringify(Array.from(cur)) : null)
  }
}

function isSelected(optId: string) {
  if (!props.userAnswer) return false
  if (props.question.type === 'true_false') return props.userAnswer === optId
  try {
    return JSON.parse(props.userAnswer).includes(optId)
  } catch { return false }
}
</script>
<template>
<div class="fixed inset-0 z-[100] flex flex-col bg-[rgb(var(--md-background))] text-[rgb(var(--md-on-surface))] h-screen overflow-hidden">

<!-- Top Navigation Bar (Shared Component Anchor) -->
<header class="bg-[rgb(var(--md-surface-container))] docked full-width top-0 z-50 border-b border-[rgb(var(--md-outline-variant))] flat no shadows h-12 flex justify-between items-center w-full px-4 md:px-8">
<!-- Brand & Modes -->
<div class="flex items-center gap-4lg">
<div class="flex items-center gap-4xs cursor-pointer active:scale-95 transition-transform duration-100">
<span class="material-symbols-outlined text-[rgb(var(--md-primary))] text-2xl" data-icon="pets">pets</span>
<span class="  font-bold text-[rgb(var(--md-primary))]">Exameow</span>
</div>
<!-- Navigation Links / Mode Switcher -->
<nav class="hidden md:flex items-center gap-4md ml-4md">
<!-- Active link: Practice -->
<a class="text-[rgb(var(--md-primary))] border-b-2 border-[rgb(var(--md-primary))] font-semibold py-1   flex items-center gap-1" href="#practice">
<span class="w-1.5 h-1.5 rounded-full bg-[rgb(var(--md-primary))] inline-block"></span>
          Practice
        </a>
<a class="text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] py-1   hover:bg-[rgb(var(--md-surface-bright))] transition-colors duration-150 rounded px-2" href="#exam">
          Exam
        </a>
<a class="text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] py-1   hover:bg-[rgb(var(--md-surface-bright))] transition-colors duration-150 rounded px-2" href="#flashcard">
          Flashcard
        </a>
</nav>
</div>
<!-- Center Progress Indicator HUD -->
<div class="hidden sm:flex items-center gap-4md">
<div class="flex flex-col items-center">
<div class="flex items-center gap-4xs   text-[rgb(var(--md-on-surface-variant))]">
<span class="">Question</span>
<span class="text-[rgb(var(--md-primary))] font-semibold">4</span>
<span class="">of 8</span>
</div>
<div class="w-36 h-1.5 bg-[rgb(var(--md-surface-container-high))] rounded-full overflow-hidden mt-1">
<div class="h-full bg-[rgb(var(--md-primary-container))] rounded-full w-[{{ (questionNumber/totalQuestions)*100 }}%] transition-all duration-300"></div>
</div>
</div>
</div>
<!-- Trailing Actions & Primary Action -->
<div class="flex items-center gap-4sm">
<!-- Trailing Action Icons -->
<button class="p-1.5 text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-bright))] transition-colors duration-150 active:scale-95 rounded-lg flex items-center relative" title="Flagged Questions">
<span class="material-symbols-outlined text-xl" data-icon="bookmark">bookmark</span>
<span class="absolute -top-0.5 -right-0.5 bg-[rgb(var(--md-secondary-container))] text-[rgb(var(--md-on-secondary))] px-1 text-[10px] font-bold rounded-full leading-tight">2</span>
</button>
<button class="p-1.5 text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-bright))] transition-colors duration-150 active:scale-95 rounded-lg flex items-center" id="toggle-palette-btn" title="Question Palette">
<span class="material-symbols-outlined text-xl" data-icon="grid_view">grid_view</span>
</button>
<!-- Timer Indicator -->
<div class="flex items-center gap-1 px-2.5 py-1 bg-[rgb(var(--md-surface-container-high))] rounded-lg text-[rgb(var(--md-on-surface))] border border-[rgba(var(--md-outline-variant), 0.40)]   font-mono">
<span class="material-symbols-outlined text-sm text-[rgb(var(--md-primary))]" data-icon="timer">timer</span>
<span class="">01:24</span>
</div>
<!-- Trailing Primary Action -->
<button class="bg-[rgb(var(--md-error-container))] text-[rgb(var(--md-on-error))] hover:bg-opacity-90 active:scale-95 transition-transform duration-100   px-3 py-1.5 rounded-lg font-medium ml-4xs flex items-center gap-1">
<span class="">End Session</span>
</button>
</div>
</header>
<!-- Main Body: Two-Column Split View -->
<main class="flex-1 flex overflow-hidden relative">
<!-- LEFT PANE: Passage & Problem Context (50%) -->
<section class="w-1/2 h-full overflow-y-auto bg-[rgb(var(--md-surface-container-low))] p-6 md:p-8 border-r border-[rgba(var(--md-outline-variant), 0.30)] flex flex-col justify-between">
<div>
<!-- Question Meta Chips -->
<div class="flex items-center gap-4sm flex-wrap mb-4md">
<span class="px-2.5 py-0.5 rounded-md bg-[rgba(var(--md-primary), 0.10)] border border-[rgba(var(--md-primary), 0.30)] text-[rgb(var(--md-primary))]   font-semibold flex items-center gap-1">
<span class="w-1.5 h-1.5 rounded-full bg-[rgb(var(--md-primary))]"></span>
            Question 04
          </span>
<span class="px-2.5 py-0.5 rounded-md bg-[rgb(var(--md-surface-container-high))] text-[rgb(var(--md-on-surface-variant))]  ">
            Single Choice
          </span>
<span class="px-2.5 py-0.5 rounded-md bg-[rgb(var(--md-surface-container))] border border-[rgba(var(--md-outline-variant), 0.40)] text-[rgb(var(--md-on-surface))]   flex items-center gap-1">
<span class="material-symbols-outlined text-[13px] text-[rgb(var(--md-primary))]" data-icon="apps">apps</span>
            Cell Biology · Section 2.4
          </span>
</div>
<!-- Question Stem / Prompt -->
<h1 class="  text-[rgb(var(--md-on-surface))] mb-4md leading-relaxed">
          Which of the following statements is <span class="text-[rgb(var(--md-tertiary-container))] underline underline-offset-4 decoration-[rgba(var(--md-tertiary-container), 0.60)] font-bold">FALSE</span> regarding the molecules indicated by <span class="bg-[rgba(var(--md-error-container), 0.40)] text-[rgb(var(--md-error))] px-1.5 py-0.5 rounded text-code-inline font-code-inline border border-[rgb(var(--md-error-container))]">label 6</span> in the fluid mosaic membrane diagram below?
        </h1>
<!-- Diagram Graphic Container -->
<div class="mt-4md rounded-xl bg-[rgb(var(--md-surface-container-lowest))] border border-[rgba(var(--md-outline-variant), 0.50)] p-4md shadow-inner relative group">
<!-- Diagram Action Bar Overlay -->
<div class="absolute top-space-md right-space-md flex items-center gap-4xs z-10">
<button class="flex items-center gap-1 px-2.5 py-1 rounded bg-[rgba(var(--md-surface-container), 0.90)] backdrop-blur-sm border border-[rgba(var(--md-outline-variant), 0.60)] text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))]   transition-colors duration-150">
<span class="material-symbols-outlined text-sm" data-icon="search">search</span>
<span class="">Click to expand</span>
</button>
</div>
<!-- Embedded Diagram Asset -->
<div class="w-full flex items-center justify-center p-4xs rounded-lg overflow-hidden bg-[#0c0e14]">
<img alt="Fluid Mosaic Model of Cell Membrane Diagram" class="max-h-[380px] w-auto object-contain rounded drop-shadow-md" src="https://lh3.googleusercontent.com/aida/AEtjO1W22KWprP540znti7eUmCMHSKrTJgRA2pSXxO2Bf1DRSJt5dmMCffQ1mWjJbsKEdRC7Em5bC8CdDgs5uX7ZKoTvOLf6JPmyYn0-EEweYvmYxK-bhM2vG9x3fPzprYbXSLlhanbOrm7FVH0WmRYFFiud_-CWtyfL-Fo5Zaq-0RdIwj4fpNCviEkUY2jzf49wojOm5FgvTf7xh_7AwcJRc_KfqTjWnuVIpAXCCFtxztcQzCg5cTfCUQIdpdg">
</div>
<!-- Figure Caption -->
<div class="mt-4sm pt-4xs border-t border-[rgba(var(--md-outline-variant), 0.30)] flex items-center justify-between   text-[rgb(var(--md-on-surface-variant))]">
<span class="">Figure 2.4: Cross-section of eukaryotic plasma membrane showing lipid bilayer components</span>
<span class="text-[rgb(var(--md-outline))]">Scale: Schematic</span>
</div>
</div>
</div>
<!-- Pedagogical Hint Box -->

</section>
<!-- Draggable Divider Visual Cue -->
<div class="w-1 bg-[rgb(var(--md-surface-container))] hover:bg-[rgba(var(--md-primary), 0.50)] transition-colors cursor-col-resize flex items-center justify-center relative z-20 group">
<div class="w-2.5 h-7 rounded bg-[rgb(var(--md-outline-variant))] flex flex-col justify-center items-center gap-0.5 shadow">
<span class="w-0.5 h-0.5 rounded-full bg-[rgb(var(--md-on-surface-variant))]"></span>
<span class="w-0.5 h-0.5 rounded-full bg-[rgb(var(--md-on-surface-variant))]"></span>
<span class="w-0.5 h-0.5 rounded-full bg-[rgb(var(--md-on-surface-variant))]"></span>
</div>
</div>
<!-- RIGHT PANE: Option Selector Stack (50%) -->
<section class="w-1/2 h-full overflow-y-auto bg-[rgb(var(--md-surface))] p-6 md:p-8 flex flex-col justify-between">
<div class="space-y-space-md">
<!-- Choices Header -->
<div class="flex items-center justify-between border-b border-[rgba(var(--md-outline-variant), 0.30)] pb-4sm mb-4md">
<div class="flex items-center gap-4xs">
<span class="  font-semibold text-[rgb(var(--md-on-surface))]">Choose your answer</span>
<span class="  text-[rgb(var(--md-outline))]">(Select 1 of 4)</span>
</div>
<span class="  text-[rgb(var(--md-outline-variant))] font-mono">Shortcuts: [A-D]</span>
</div>
<!-- Option Stack -->
<div aria-label="Multiple Choice Options" class="flex flex-col gap-4md" role="radiogroup">
<!-- Option A (Unselected) -->
<label class="group relative flex items-start gap-4md p-4md rounded-xl bg-[rgb(var(--md-surface-container))] border border-[rgba(var(--md-outline-variant), 0.50)] hover:bg-[rgb(var(--md-surface-bright))] hover:border-[rgb(var(--md-outline))] transition-all duration-150 cursor-pointer">
<input class="sr-only" name="question_choice" type="radio" value="A">
<!-- Badge & Keycap -->
<div class="flex flex-col items-center gap-1 flex-shrink-0">
<span class="w-7 h-7 rounded-lg bg-[rgb(var(--md-surface-container-high))] text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] group-hover:bg-[rgb(var(--md-surface-bright))] border border-[rgba(var(--md-outline-variant), 0.50)] flex items-center justify-center   text-xs font-bold transition-colors">
                A
              </span>
<span class="text-[10px] font-mono text-[rgb(var(--md-outline))]">[1]</span>
</div>
<!-- Option Content -->
<div class="flex-1 pt-0.5">
<p class="  text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] transition-colors">
                They are cholesterol molecules inserted between phospholipid fatty acid chains.
              </p>
</div>
<!-- Indicator Radio Box -->
<div class="w-5 h-5 rounded-full border-2 border-[rgb(var(--md-outline-variant))] group-hover:border-[rgb(var(--md-outline))] flex items-center justify-center flex-shrink-0 mt-0.5">
<div class="w-2 h-2 rounded-full bg-transparent"></div>
</div>
</label>
<!-- Option B (SELECTED STATE) -->
<label class="group relative flex items-start gap-4md p-4md rounded-xl bg-[rgb(var(--md-surface-container))] border-2 border-[rgb(var(--md-primary-container))] ring-2 ring-[rgba(var(--md-primary-container), 0.20)] transition-all duration-150 cursor-pointer shadow-lg shadow-[0_4px_16px_rgba(var(--md-primary-container),0.5)]">
<input checked="" class="sr-only" name="question_choice" type="radio" value="B">
<!-- Badge & Keycap (Active State) -->
<div class="flex flex-col items-center gap-1 flex-shrink-0">
<span class="w-7 h-7 rounded-lg bg-[rgb(var(--md-primary-container))] text-[rgb(var(--md-on-primary-container))] flex items-center justify-center   text-xs font-bold shadow-sm">
                B
              </span>
<span class="text-[10px] font-mono text-[rgb(var(--md-primary))] font-bold">[2]</span>
</div>
<!-- Option Content -->
<div class="flex-1 pt-0.5">
<p class="  text-[rgb(var(--md-on-surface))] font-medium">
                They form rigid covalent bonds with adjacent phospholipid heads to freeze the membrane.
              </p>
</div>
<!-- Indicator Radio Box (Active State) -->
<div class="w-5 h-5 rounded-full border-2 border-[rgb(var(--md-primary))] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[rgb(var(--md-surface-container-lowest))]">
<div class="w-2.5 h-2.5 rounded-full bg-[rgb(var(--md-primary))]"></div>
</div>
</label>
<!-- Option C (Unselected) -->
<label class="group relative flex items-start gap-4md p-4md rounded-xl bg-[rgb(var(--md-surface-container))] border border-[rgba(var(--md-outline-variant), 0.50)] hover:bg-[rgb(var(--md-surface-bright))] hover:border-[rgb(var(--md-outline))] transition-all duration-150 cursor-pointer">
<input class="sr-only" name="question_choice" type="radio" value="C">
<!-- Badge & Keycap -->
<div class="flex flex-col items-center gap-1 flex-shrink-0">
<span class="w-7 h-7 rounded-lg bg-[rgb(var(--md-surface-container-high))] text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] group-hover:bg-[rgb(var(--md-surface-bright))] border border-[rgba(var(--md-outline-variant), 0.50)] flex items-center justify-center   text-xs font-bold transition-colors">
                C
              </span>
<span class="text-[10px] font-mono text-[rgb(var(--md-outline))]">[3]</span>
</div>
<!-- Option Content -->
<div class="flex-1 pt-0.5">
<p class="  text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] transition-colors">
                They act as a bidirectional temperature buffer, moderating membrane fluidity in extreme heat or cold.
              </p>
</div>
<!-- Indicator Radio Box -->
<div class="w-5 h-5 rounded-full border-2 border-[rgb(var(--md-outline-variant))] group-hover:border-[rgb(var(--md-outline))] flex items-center justify-center flex-shrink-0 mt-0.5">
<div class="w-2 h-2 rounded-full bg-transparent"></div>
</div>
</label>
<!-- Option D (Unselected) -->
<label class="group relative flex items-start gap-4md p-4md rounded-xl bg-[rgb(var(--md-surface-container))] border border-[rgba(var(--md-outline-variant), 0.50)] hover:bg-[rgb(var(--md-surface-bright))] hover:border-[rgb(var(--md-outline))] transition-all duration-150 cursor-pointer">
<input class="sr-only" name="question_choice" type="radio" value="D">
<!-- Badge & Keycap -->
<div class="flex flex-col items-center gap-1 flex-shrink-0">
<span class="w-7 h-7 rounded-lg bg-[rgb(var(--md-surface-container-high))] text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] group-hover:bg-[rgb(var(--md-surface-bright))] border border-[rgba(var(--md-outline-variant), 0.50)] flex items-center justify-center   text-xs font-bold transition-colors">
                D
              </span>
<span class="text-[10px] font-mono text-[rgb(var(--md-outline))]">[4]</span>
</div>
<!-- Option Content -->
<div class="flex-1 pt-0.5">
<p class="  text-[rgb(var(--md-on-surface-variant))] group-hover:text-[rgb(var(--md-on-surface))] transition-colors">
                They contain a small hydrophilic hydroxyl group oriented toward the aqueous exterior.
              </p>
</div>
<!-- Indicator Radio Box -->
<div class="w-5 h-5 rounded-full border-2 border-[rgb(var(--md-outline-variant))] group-hover:border-[rgb(var(--md-outline))] flex items-center justify-center flex-shrink-0 mt-0.5">
<div class="w-2 h-2 rounded-full bg-transparent"></div>
</div>
</label>
</div>
</div>
<!-- Action Area for Right Pane -->
<div class="pt-4lg border-t border-[rgba(var(--md-outline-variant), 0.30)] flex items-center justify-between gap-4md mt-4lg">
<button class="text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-bright))] py-2 px-4md rounded-lg   transition-colors duration-150 flex items-center gap-1" type="button">
<span class="material-symbols-outlined text-base" data-icon="close">close</span>
          Clear Selection
        </button>
<div class="flex items-center gap-4sm">
<button class="bg-[rgb(var(--md-primary-container))] hover:bg-[rgba(var(--md-primary-container), 0.90)] text-[rgb(var(--md-on-primary-container))]   text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-[0_4px_16px_rgba(var(--md-primary-container),0.20)] active:scale-95 transition-all duration-150 flex items-center gap-2 font-semibold" type="button">
<span class="">Check Answer</span>
<span class="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
</button>
</div>
</div>
</section>
<!-- SideNavBar (Slide-over Question Palette Modal Anchor) -->
<aside class="fixed top-0 right-0 h-full w-80 z-50 bg-[rgb(var(--md-surface-container-low))] border-l border-[rgb(var(--md-outline-variant))] shadow-2xl flex flex-col justify-between p-6 transition-transform duration-300 translate-x-full" id="side-palette">
<!-- SideNav Header -->
<div>
<div class="flex items-center justify-between pb-4sm border-b border-[rgba(var(--md-outline-variant), 0.30)]">
<div class="flex items-center gap-4sm">
<span class="material-symbols-outlined text-[rgb(var(--md-primary))]" data-icon="apps">apps</span>
<div>
<h2 class="  font-semibold text-[rgb(var(--md-on-surface))]">Question Palette</h2>
<p class="  text-[rgb(var(--md-on-surface-variant))]">60 Questions Total</p>
</div>
</div>
<button class="p-1 rounded-md text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-container-high))] transition-colors" id="close-palette-btn">
<span class="material-symbols-outlined text-lg" data-icon="close">close</span>
</button>
</div>
<!-- Filter Navigation Tabs (JSON Anchor) -->
<nav class="flex flex-col gap-1 mt-4md">
<!-- Active: All Questions -->
<a class="flex items-center gap-4sm bg-[rgb(var(--md-surface-container-high))] text-[rgb(var(--md-primary))] rounded-lg px-4md py-4sm font-semibold  " href="#all">
<span class="material-symbols-outlined text-base" data-icon="apps">apps</span>
<span class="">All Questions</span>
</a>
<a class="flex items-center gap-4sm text-[rgb(var(--md-on-surface-variant))] hover:bg-[rgb(var(--md-surface-container-high))] hover:text-[rgb(var(--md-on-surface))] transition-colors duration-150 rounded-lg px-4md py-4sm  " href="#flagged">
<span class="material-symbols-outlined text-base text-[rgb(var(--md-tertiary))]" data-icon="flag">flag</span>
<span class="">Flagged</span>
</a>
<a class="flex items-center gap-4sm text-[rgb(var(--md-on-surface-variant))] hover:bg-[rgb(var(--md-surface-container-high))] hover:text-[rgb(var(--md-on-surface))] transition-colors duration-150 rounded-lg px-4md py-4sm  " href="#incorrect">
<span class="material-symbols-outlined text-base" data-icon="bookmark_remove">bookmark_remove</span>
<span class="">Incorrect (Wrong Book)</span>
</a>
<a class="flex items-center gap-4sm text-[rgb(var(--md-on-surface-variant))] hover:bg-[rgb(var(--md-surface-container-high))] hover:text-[rgb(var(--md-on-surface))] transition-colors duration-150 rounded-lg px-4md py-4sm  " href="#unanswered">
<span class="material-symbols-outlined text-base" data-icon="radio_button_unchecked">radio_button_unchecked</span>
<span class="">Unanswered</span>
</a>
</nav>
<!-- Question Grid Matrix -->
<div class="mt-4lg">
<div class="  text-[rgb(var(--md-outline-variant))] font-semibold uppercase tracking-wider mb-2">Matrix Navigation</div>
<div class="grid grid-cols-5 gap-2">
<button class="h-9 rounded-lg bg-[rgb(var(--md-surface-container))] border border-[rgb(var(--md-outline-variant))] text-[rgb(var(--md-on-surface))] font-mono text-xs flex items-center justify-center">1</button>
<button class="h-9 rounded-lg bg-[rgb(var(--md-surface-container))] border border-[rgb(var(--md-outline-variant))] text-[rgb(var(--md-on-surface))] font-mono text-xs flex items-center justify-center">2</button>
<button class="h-9 rounded-lg bg-[rgb(var(--md-surface-container))] border border-[rgb(var(--md-outline-variant))] text-[rgb(var(--md-on-surface))] font-mono text-xs flex items-center justify-center relative">
              3
              <span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[rgb(var(--md-tertiary))]"></span>
</button>
<!-- Current active (Q4) -->
<button class="h-9 rounded-lg bg-[rgb(var(--md-primary-container))] text-[rgb(var(--md-on-primary-container))] font-mono text-xs font-bold flex items-center justify-center ring-2 ring-[rgb(var(--md-primary))]">4</button>
<button class="h-9 rounded-lg bg-[rgba(var(--md-surface-container-high), 0.60)] text-[rgb(var(--md-outline-variant))] font-mono text-xs flex items-center justify-center">5</button>
<button class="h-9 rounded-lg bg-[rgba(var(--md-surface-container-high), 0.60)] text-[rgb(var(--md-outline-variant))] font-mono text-xs flex items-center justify-center">6</button>
<button class="h-9 rounded-lg bg-[rgba(var(--md-surface-container-high), 0.60)] text-[rgb(var(--md-outline-variant))] font-mono text-xs flex items-center justify-center">7</button>
<button class="h-9 rounded-lg bg-[rgba(var(--md-surface-container-high), 0.60)] text-[rgb(var(--md-outline-variant))] font-mono text-xs flex items-center justify-center">8</button>
</div>
</div>
</div>
<!-- Footer & Submit CTA -->
<div class="pt-4md border-t border-[rgba(var(--md-outline-variant), 0.30)] space-y-space-sm">
<button class="w-full bg-[rgb(var(--md-secondary-container))] hover:bg-[rgba(var(--md-secondary-container), 0.90)] text-[rgb(var(--md-on-secondary))]   text-sm py-2.5 rounded-xl font-semibold transition-all duration-150 active:scale-98">
          Submit Exam Sheet
        </button>
<div class="flex items-center justify-between   text-[rgb(var(--md-on-surface-variant))] pt-1 px-1">
<a class="flex items-center gap-1 hover:text-[rgb(var(--md-on-surface))]" href="#guide">
<span class="material-symbols-outlined text-sm" data-icon="help_outline">help_outline</span>
            Exam Guide
          </a>
<a class="flex items-center gap-1 hover:text-[rgb(var(--md-on-surface))]" href="#settings">
<span class="material-symbols-outlined text-sm" data-icon="tune">tune</span>
            Settings
          </a>
</div>
</div>
</aside>
</main>
<!-- Bottom Navigation HUD Bar (Linear Proctored Control) -->
<footer class="h-14 border-t border-[rgba(var(--md-outline-variant), 0.30)] bg-[rgb(var(--md-surface-container-lowest))] px-4 md:px-8 flex justify-between items-center z-40 relative">
<!-- Left Navigation: Previous Question -->
<div class="flex items-center gap-4sm">
<button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--md-surface-container))] border border-[rgba(var(--md-outline-variant), 0.40)] text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-bright))] transition-colors   active:scale-95">
<span class="material-symbols-outlined text-base" data-icon="arrow_back">arrow_back</span>
<span class="hidden sm:inline">Previous Question</span>
</button>
</div>
<!-- Center Status & Keybindings -->
<div class="flex items-center gap-4lg">
<button class="flex items-center gap-1.5 text-[rgb(var(--md-on-surface-variant))] hover:text-[rgb(var(--md-tertiary))] transition-colors  ">
<span class="material-symbols-outlined text-base" data-icon="flag">flag</span>
<span class="">Mark for Review</span>
</button>
<div class="hidden lg:flex items-center gap-2   text-[rgb(var(--md-outline))] border-l border-[rgba(var(--md-outline-variant), 0.40)] pl-4md">
<span class="">Shortcuts:</span>
<span class="px-1.5 py-0.5 rounded bg-[rgb(var(--md-surface-container))] font-mono text-[10px] text-[rgb(var(--md-on-surface-variant))] border border-[rgba(var(--md-outline-variant), 0.40)]">[1-4] Select</span>
<span class="px-1.5 py-0.5 rounded bg-[rgb(var(--md-surface-container))] font-mono text-[10px] text-[rgb(var(--md-on-surface-variant))] border border-[rgba(var(--md-outline-variant), 0.40)]">[Enter] Confirm</span>
</div>
</div>
<!-- Right Navigation: Next & Quick Actions -->
<div class="flex items-center gap-4sm">
<button class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[rgb(var(--md-surface-container-high))] border border-[rgba(var(--md-outline-variant), 0.40)] text-[rgb(var(--md-on-surface))] hover:bg-[rgb(var(--md-surface-bright))] transition-colors   font-medium active:scale-95">
<span class="">Next Question</span>
<span class="material-symbols-outlined text-base" data-icon="arrow_forward">arrow_forward</span>
</button>
<button class="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(var(--md-surface-variant), 0.40)] border border-[rgba(var(--md-outline-variant), 0.40)] text-[rgb(var(--md-outline-variant))] hover:text-[rgb(var(--md-on-surface))]   transition-colors">
<span class="">Summary</span>
</button>
</div>
</footer>
<!-- Interactive script for Palette Slide-over -->




</div>
</template>
