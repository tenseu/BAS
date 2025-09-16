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

  private readonly SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'
  private readonly CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'
  private readonly DEVICE_NAME = 'DroneController'

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

      let device: BluetoothDevice | null = null

      try {
        // Попробуем по имени
        device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: this.DEVICE_NAME }],
          optionalServices: [this.SERVICE_UUID],
        })
      } catch {
        // Фоллбэк: все устройства
        device = await (navigator.bluetooth.requestDevice as any)({
          acceptAllDevices: true,
          optionalServices: [this.SERVICE_UUID],
        })
      }

      if (!device) throw new Error('Устройство не выбрано')

      this.device = device
      // @ts-ignore — TS не знает про id
      console.log('Выбрано устройство:', this.device.name, this.device.id)

      const gatt = this.device.gatt
      if (!gatt) throw new Error('GATT недоступен')

      this.server = await gatt.connect()
      console.log('Подключено к GATT')

      const service = await this.server.getPrimaryService(this.SERVICE_UUID)
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID)

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
