<template>
  <div class="card p-5">
    <div class="flex items-start gap-4">
      <div
        class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
        :class="toneClass"
      >
        <Icon :name="icon" size="md" :stroke-width="2" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ title }}</div>
        <div class="mt-1 truncate text-2xl font-semibold text-gray-900 dark:text-white" :title="String(value)">
          {{ value }}
        </div>
        <div v-if="hint" class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {{ hint }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/icons/Icon.vue'

type Tone = 'primary' | 'success' | 'warning' | 'danger'
type IconName = InstanceType<typeof Icon>['$props']['name']

const props = withDefaults(defineProps<{
  title: string
  value: string | number
  icon: IconName
  tone?: Tone
  hint?: string
}>(), {
  tone: 'primary',
  hint: '',
})

const toneClass = computed(() => {
  const classes: Record<Tone, string> = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }
  return classes[props.tone]
})
</script>
