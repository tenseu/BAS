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

  // Список поддерживаемых UUID
  private readonly SERVICES = [
    // HM-10 / HM-19 / JDY / AT-09
    {
      service: '0000ffe0-0000-1000-8000-00805f9b34fb',
      characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb'
    },
    // Nordic UART (nRF52, Adafruit Bluefruit)
    {
      service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' // RX (для записи)
    },
    // ESP32 (SPS UART Service)
    {
      service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' // TX
    },
    // Generic GATT Serial (некоторые BLE-модули)
    {
      service: '0000180d-0000-1000-8000-00805f9b34fb',
      characteristic: '00002a37-0000-1000-8000-00805f9b34fb'
    }
  ]

  constructor() {
    console.log('BluetoothManager: Инициализация')
    console.log('navigator.bluetooth доступен:', !!navigator.bluetooth)

    if (!navigator.bluetooth) {
      this.error.value = 'Bluetooth не поддерживается в этом браузере'
      return
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      this.error.value = 'Bluetooth доступен только через HTTPS или localhost'
      return
    }
  }

  public async connect(): Promise<void> {
    console.log('BluetoothManager: Подключение…')
    this.isConnecting.value = true
    this.error.value = null

    try {
      if (!navigator.bluetooth) throw new Error('Bluetooth не поддерживается')

      // собираем все UUID для запроса
      const optionalServices = this.SERVICES.map(s => s.service)

      let device: BluetoothDevice | null = null

      try {
        // Попробуем найти по имени
        device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: this.DEVICE_NAME }],
          optionalServices
        })
      } catch {
        // fallback: все устройства
        device = await (navigator.bluetooth.requestDevice as any)({
          acceptAllDevices: true,
          optionalServices
        })
      }

      if (!device) throw new Error('Устройство не выбрано')

      this.device = device
      // @ts-ignore
      console.log('Выбрано устройство:', this.device.name, this.device.id)

      const gatt = this.device.gatt
      if (!gatt) throw new Error('GATT недоступен')

      this.server = await gatt.connect()
      console.log('Подключено к GATT')

      // Перебираем список UUID
      let found = false
      for (const s of this.SERVICES) {
        try {
          const service = await this.server.getPrimaryService(s.service)
          const characteristic = await service.getCharacteristic(s.characteristic)

          this.characteristic = characteristic
          found = true
          console.log(`✅ Найден сервис ${s.service}, характеристика ${s.characteristic}`)
          break
        } catch (e) {
          console.warn(`⏭️ Сервис ${s.service} не найден`)
        }
      }

      if (!found) throw new Error('Подходящий сервис/характеристика не найдены')

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected)

      this.isConnected.value = true
      console.log('Подключение успешно')
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
      if (this.server?.connected) {
        this.server.disconnect()
      }
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
    if (!this.characteristic) throw new Error('Нет подключения к устройству')

    const encoder = new TextEncoder()
    const json = JSON.stringify(data)
    const encoded = encoder.encode(json)

    await this.characteristic.writeValue(encoded)
    console.log('Отправлено:', json)
  }
}
