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

  private readonly DEVICE_NAME = 'DroneController'

  // Список поддерживаемых UUID (оставил для реального режима, но они не используются в тестовом)
  private readonly SERVICES = [
    {
      service: '0000ffe0-0000-1000-8000-00805f9b34fb',
      characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb'
    },
    {
      service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
    },
    {
      service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3'
    },
    {
      service: '0000180d-0000-1000-8000-00805f9b34fb',
      characteristic: '00002a37-0000-1000-8000-00805f9b34fb'
    }
  ]

  constructor() {
    console.log('BluetoothManager: Инициализация')
    console.log('navigator.bluetooth доступен:', !!navigator.bluetooth)
  }

  public async connect(): Promise<void> {
    console.log('BluetoothManager: Подключение…')
    this.isConnecting.value = true
    this.error.value = null

    try {
      // 🔹 Тестовый режим: просто подставляем фейковое устройство
      this.device = { name: "Mock DroneController" } as BluetoothDevice
      this.server = null
      this.characteristic = null

      this.isConnected.value = true

      // Зеленый лог для наглядности
      console.log('%c✅ Сопряжение установлено', 'color: limegreen; font-weight: bold;')
    } catch (err) {
      console.error('Ошибка подключения:', err)
      this.error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      this.isConnecting.value = false
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.device = null
      this.server = null
      this.characteristic = null
      this.isConnected.value = false
      console.log('Отключено')
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : String(err)
      console.error('Ошибка отключения:', err)
    }
  }

  private onDisconnected = () => {
    console.warn('Устройство отключено')
    this.isConnected.value = false
    this.error.value = 'Устройство отключено'
  }

  public async sendData(data: ControllerData): Promise<void> {
    if (!this.isConnected.value) {
      console.warn('Нет подключения (тестовый режим: данные не отправляются)')
      return
    }

    const json = JSON.stringify(data)
    console.log('📤 Отправлено:', json)
  }
}
