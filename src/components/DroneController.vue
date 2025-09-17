<template>
  <div class="controller-container">
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

    <div class="controls">
      <div class="joysticks">
        <div class="joystick-wrapper">
          <VirtualJoystick
            @update="updateLeftStick"
            base-color="#1976D2"
            stick-color="#2196F3"
          />
        </div>
        <div class="joystick-wrapper">
          <VirtualJoystick
            @update="updateRightStick"
            base-color="#C2185B"
            stick-color="#E91E63"
          />
        </div>
      </div>

      <div class="buttons">
        <div class="button-row">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
    console.log('DroneController: Попытка переключения подключения');
    if (bluetoothManager.isConnected.value) {
      console.log('DroneController: Отключение');
      await bluetoothManager.disconnect();
    } else {
      console.log('DroneController: Подключение');
      await bluetoothManager.connect();
    }
  } catch (error) {
    console.error('DroneController: Ошибка:', error);
  }
}

// Очистка при размонтировании
onUnmounted(() => {
  if (bluetoothManager.isConnected.value) {
    bluetoothManager.disconnect()
  }
})
</script>

<style scoped>
.controller-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 auto;
}

.status-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.error-message {
  color: #f44336;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.joysticks {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.joystick-wrapper {
  text-align: center;
}

.joystick-wrapper h3 {
  margin-bottom: 10px;
  color: #333;
}

.buttons {
  display: flex;
  justify-content: center;
}

.button-row {
  display: flex;
  gap: 10px;
}

.control-button {
  min-width: 100px;
  height: 50px;
}
</style>
