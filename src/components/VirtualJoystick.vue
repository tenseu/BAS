<template>
  <div
    class="joystick-container"
    :style="{ width: size + 'px', height: size + 'px' }"
    @mousedown.prevent="startDrag"
    @touchstart.prevent="startDrag"
    @mousemove.prevent="onDrag"
    @touchmove.prevent="onDrag"
    @mouseup.prevent="stopDrag"
    @touchend.prevent="stopDrag"
    @touchcancel.prevent="stopDrag"
    @mouseleave.prevent="stopDrag"
  >
    <div
      class="joystick-base"
      :style="{
        width: size + 'px',
        height: size + 'px',
        backgroundColor: baseColor
      }"
    ></div>
    <div
      class="joystick-stick"
      :style="{
        width: stickSize + 'px',
        height: stickSize + 'px',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        backgroundColor: stickColor
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  size?: number
  stickSize?: number
  baseColor?: string
  stickColor?: string
}>()

const emit = defineEmits<{
  (e: 'update', x: number, y: number): void
}>()

const size = computed(() => props.size || 150)
const stickSize = computed(() => props.stickSize || 60)
const baseColor = computed(() => props.baseColor || '#2c3e50')
const stickColor = computed(() => props.stickColor || '#42b983')

const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const activeTouchId = ref<number | null>(null)
const containerRect = ref<DOMRect | null>(null)

// --- Начало перемещения ---
const startDrag = (event: MouseEvent | TouchEvent) => {
  if (event instanceof TouchEvent) {
    const touch = event.changedTouches[0]
    activeTouchId.value = touch.identifier
    isDragging.value = true
    containerRect.value = (event.currentTarget as HTMLElement).getBoundingClientRect()
    updatePosition(touch)
  } else if (event instanceof MouseEvent) {
    activeTouchId.value = null
    isDragging.value = true
    containerRect.value = (event.currentTarget as HTMLElement).getBoundingClientRect()
    updatePosition(event)
  }
}

// --- Перемещение ---
const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  if (event instanceof TouchEvent) {
    const touch = Array.from(event.changedTouches).find(t => t.identifier === activeTouchId.value)
    if (!touch) return
    updatePosition(touch)
  } else if (event instanceof MouseEvent) {
    updatePosition(event)
  }
}

// --- Окончание перемещения ---
const stopDrag = (event?: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  if (event instanceof TouchEvent) {
    const touch = Array.from(event.changedTouches).find(t => t.identifier === activeTouchId.value)
    if (!touch) return
  }

  isDragging.value = false
  activeTouchId.value = null
  position.value = { x: 0, y: 0 }
  emit('update', 0, 0)
}

// --- Обновление позиции ---
const updatePosition = (event: MouseEvent | Touch) => {
  if (!containerRect.value) return

  const clientX = 'clientX' in event ? event.clientX : 0
  const clientY = 'clientY' in event ? event.clientY : 0

  const centerX = containerRect.value.left + size.value / 2
  const centerY = containerRect.value.top + size.value / 2

  let x = clientX - centerX
  let y = clientY - centerY

  const maxDistance = (size.value - stickSize.value) / 2
  const distance = Math.sqrt(x * x + y * y)

  if (distance > maxDistance) {
    const angle = Math.atan2(y, x)
    x = Math.cos(angle) * maxDistance
    y = Math.sin(angle) * maxDistance
  }

  position.value = { x, y }
  emit('update', x / maxDistance, y / maxDistance)
}

onUnmounted(() => stopDrag())
</script>

<style scoped>
.joystick-container {
  position: relative;
  touch-action: none;
  user-select: none;
}

.joystick-base {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.joystick-stick {
  position: absolute;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  transition: transform 0.1s ease-out;
}
.joystick-stick:active {
  cursor: grabbing;
}
</style>
