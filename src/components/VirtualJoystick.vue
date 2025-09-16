<template>
  <div
    class="joystick-container"
    :style="{ width: size + 'px', height: size + 'px' }"
    @touchstart.prevent="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend.prevent="onTouchEnd"
    @touchcancel.prevent="onTouchEnd"
    @mousedown.prevent="onMouseDown"
    @mousemove.prevent="onMouseMove"
    @mouseup.prevent="onMouseUp"
    @mouseleave.prevent="onMouseUp"
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

const onTouchStart = (event: TouchEvent) => {
  if (activeTouchId.value !== null) return // уже захватили одно касание
  const touch = event.changedTouches[0]
  activeTouchId.value = touch.identifier
  startDrag(touch.clientX, touch.clientY, event.currentTarget as HTMLElement)
}

const onTouchMove = (event: TouchEvent) => {
  if (activeTouchId.value === null) return
  const touch = Array.from(event.touches).find(t => t.identifier === activeTouchId.value)
  if (!touch) return
  updatePosition(touch.clientX, touch.clientY)
}

const onTouchEnd = (event: TouchEvent) => {
  if (activeTouchId.value === null) return
  const touch = Array.from(event.changedTouches).find(t => t.identifier === activeTouchId.value)
  if (!touch) return
  stopDrag()
}

const onMouseDown = (event: MouseEvent) => {
  startDrag(event.clientX, event.clientY, event.currentTarget as HTMLElement)
  isDragging.value = true
}

const onMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  updatePosition(event.clientX, event.clientY)
}

const onMouseUp = () => {
  if (!isDragging.value) return
  stopDrag()
}

const startDrag = (clientX: number, clientY: number, container: HTMLElement) => {
  containerRect.value = container.getBoundingClientRect()
  isDragging.value = true
  updatePosition(clientX, clientY)
}

const updatePosition = (clientX: number, clientY: number) => {
  if (!containerRect.value) return

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

const stopDrag = () => {
  isDragging.value = false
  activeTouchId.value = null
  position.value = { x: 0, y: 0 }
  emit('update', 0, 0)
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
  transition: transform 0.05s ease-out;
}
.joystick-stick:active {
  cursor: grabbing;
}
</style>
