import { ref } from 'vue'

export interface ControllerData {
  leftStick: { x: number; y: number }
  rightStick: { x: number; y: number }
  buttons: { [key: string]: boolean }
}

export class BluetoothManager {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null

  public isConnected = ref(false)
  public isConnecting = ref(false)
  public error = ref<string | null>(null)

  constructor() {
    console.log('BluetoothManager: Инициализация (тестовый режим)')
  }

  public async connect(): Promise<void> {
    console.log('BluetoothManager: Подключение (тестовый режим)…')
    this.isConnecting.value = true
    this.error.value = null

    try {
      // имитация выбора устройства
      this.device = { name: 'Mock DroneController' } as BluetoothDevice
      this.server = null
      this.characteristic = null

      // отмечаем подключение
      this.isConnected.value = true

      // зелёный лог
      console.log('%c✅ Сопряжение установлено', 'color: limegreen; font-weight: bold;')
    } catch (err) {
      console.error('Ошибка подключения (тест):', err)
      this.error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      this.isConnecting.value = false
    }
  }

  public async disconnect(): Promise<void> {
    this.device = null
    this.server = null
    this.characteristic = null
    this.isConnected.value = false
    console.log('🔌 Отключено (тестовый режим)')
  }

  private onDisconnected = () => {
    console.warn('Устройство отключено (тест)')
    this.isConnected.value = false
    this.error.value = 'Устройство отключено'
  }

  public async sendData(data: ControllerData): Promise<void> {
    if (!this.isConnected.value) {
      console.warn('Нет подключения (тестовый режим)')
      return
    }

    const json = JSON.stringify(data)
    console.log('📤 Отправлено (имитация):', json)
  }
}
