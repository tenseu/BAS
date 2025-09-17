<template>
  <div class="controller-container">
    <!-- Статус-панель сверху -->
    <div class="status-bar">
      <q-btn
        :color="bluetoothManager.isConnected.value ? 'negative' : 'primary'"
        :loading="bluetoothManager.isConnecting.value"
        @click="toggleConnection"
      >
        {{ bluetoothManager.isConnected.value ? 'Отключиться' : 'Подключиться' }}
      </q-btn>
      <div v-if="bluetoothManager.error" class="error-message">
        {{ bluetoothManager.error }}
      </div>
    </div>

    <!-- Основные элементы контроллера -->
    <div class="controls">
      <!-- Левый стик -->
      <div class="joystick-wrapper">
        <VirtualJoystick
          @update="updateLeftStick"
          :size="joystickSize"
          base-color="#1976D2"
          stick-color="#2196F3"
        />
      </div>

      <!-- Кнопки -->
      <div class="buttons">
        <q-btn
          v-for="button in buttons"
          :key="button.id"
          :color="buttonStates[button.id] ? 'primary' : 'grey'"
          class="control-button"
          @mousedown="buttonDown(button.id)"
          @mouseup="buttonUp(button.id)"
          @touchstart="buttonDown(button.id)"
          @touchend="buttonUp(button.id)"
        >
          {{ button.label }}
        </q-btn>
      </div>

      <!-- Правый стик -->
      <div class="joystick-wrapper">
        <VirtualJoystick
          @update="updateRightStick"
          :size="joystickSize"
          base-color="#C2185B"
          stick-color="#E91E63"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import VirtualJoystick from './VirtualJoystick.vue'
import { BluetoothManager, type ControllerData } from '@/services/BluetoothManager'

const bluetoothManager = new BluetoothManager()

const leftStick = ref({ x: 0, y: 0 })
const rightStick = ref({ x: 0, y: 0 })
const buttonStates = ref<Record<string, boolean>>({})

const buttons = [
  { id: 'takeoff', label: 'Взлет' },
  { id: 'land', label: 'Посадка' },
  { id: 'emergency', label: 'Стоп' },
  { id: 'mode', label: 'Режим' }
]

// размер стика адаптивно ~40% высоты экрана
const joystickSize = computed(() => Math.min(window.innerHeight * 0.4, 250))

const updateLeftStick = (x: number, y: number) => {
  leftStick.value = { x, y }
  sendControllerData()
}

const updateRightStick = (x: number, y: number) => {
  rightStick.value = { x, y }
  sendControllerData()
}

const buttonDown = (buttonId: string) => {
  buttonStates.value[buttonId] = true
  sendControllerData()
}

const buttonUp = (buttonId: string) => {
  buttonStates.value[buttonId] = false
  sendControllerData()
}

const sendControllerData = async () => {
  if (!bluetoothManager.isConnected.value) return

  const data: ControllerData = {
    leftStick: leftStick.value,
    rightStick: rightStick.value,
    buttons: buttonStates.value
  }

  try {
    await bluetoothManager.sendData(data)
  } catch (error) {
    console.error('Ошибка отправки данных:', error)
  }
}

const toggleConnection = async () => {
  try {
    if (bluetoothManager.isConnected.value) {
      await bluetoothManager.disconnect()
    } else {
      await bluetoothManager.connect()
    }
  } catch (error) {
    console.error('DroneController: Сопряжение установлено:', error)
  }
}

onUnmounted(() => {
  if (bluetoothManager.isConnected.value) {
    bluetoothManager.disconnect()
  }
})
</script>

<style scoped>
.controller-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #121212;
  color: #fff;
  padding: env(safe-area-inset-top) 12px env(safe-area-inset-bottom) 12px;
  box-sizing: border-box;
}

.status-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.error-message {
  color: #6bd367;
  font-size: 14px;
}

.controls {
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.joystick-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
  min-width: 140px;
  align-items: center;
}

.control-button {
  width: 100%;
  height: 56px;
  font-size: 16px;
  border-radius: 12px;
}
</style>
