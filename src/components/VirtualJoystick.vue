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
const containerRect = ref<DOMRect | null>(null)
const activeTouchId = ref<number | null>(null)

// Начало перемещения
const startDrag = (event: MouseEvent | TouchEvent) => {
  let pointer: MouseEvent | Touch

  if (event instanceof TouchEvent) {
    pointer = event.touches[0]  // берем первый палец
    activeTouchId.value = pointer.identifier
  } else {
    pointer = event
  }

  isDragging.value = true
  const container = event.currentTarget as HTMLElement
  containerRect.value = container.getBoundingClientRect()
  updatePosition(pointer)
}


// Перемещение
const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  if ('touches' in event) {
    const touch = Array.from(event.touches).find(t => t.identifier === activeTouchId.value)
    if (!touch) return
    updatePosition(touch)
  } else {
    updatePosition(event)
  }
}

// Окончание перемещения
const stopDrag = (event?: MouseEvent | TouchEvent) => {
  if (event && 'touches' in event) {
    const remainingTouches = Array.from(event.touches).filter(t => t.identifier === activeTouchId.value)
    if (remainingTouches.length > 0) return
  }

  isDragging.value = false
  activeTouchId.value = null
  position.value = { x: 0, y: 0 }
  emit('update', 0, 0)
}

// Универсальная функция для получения координат
const getEventCoords = (event: MouseEvent | Touch): { clientX: number; clientY: number } => {
  if ('clientX' in event && 'clientY' in event) return { clientX: event.clientX, clientY: event.clientY }
  return { clientX: 0, clientY: 0 }
}

// Обновление позиции стика
const updatePosition = (event: MouseEvent | Touch) => {
  if (!containerRect.value) return

  const { clientX, clientY } = getEventCoords(event)

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

  const normalizedX = x / maxDistance
  const normalizedY = y / maxDistance

  emit('update', normalizedX, normalizedY)
}

onUnmounted(() => {
  stopDrag()
})
</script>

<style scoped>
.joystick-container {
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.joystick-base {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.joystick-stick {
  position: absolute;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  transition: transform 0.1s ease-out;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.joystick-stick:active {
  cursor: grabbing;
}
</style>
