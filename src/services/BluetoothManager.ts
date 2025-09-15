import { ref } from 'vue'

export interface ControllerData {
  leftStick: {
    x: number
    y: number
  }
  rightStick: {
    x: number
    y: number
  }
  buttons: {
    [key: string]: boolean
  }
}

export class BluetoothManager {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null

  public isConnected = ref<boolean>(false)
  public isConnecting = ref<boolean>(false)
  public error = ref<string | null>(null)

  private readonly SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'
  private readonly CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'
  private readonly DEVICE_NAME = 'DroneController'

  constructor() {
    console.log('BluetoothManager: Инициализация')
    console.log('BluetoothManager: navigator.bluetooth доступен:', !!navigator.bluetooth)
    console.log('BluetoothManager: Протокол:', window.location.protocol)
    console.log('BluetoothManager: Хост:', window.location.hostname)

    if (!navigator.bluetooth) {
      console.error('BluetoothManager: Bluetooth не поддерживается')
      this.error.value = 'Bluetooth не поддерживается в этом браузере'
      return
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.error('BluetoothManager: Неверный протокол')
      this.error.value = 'Bluetooth доступен только через HTTPS или localhost'
      return
    }

    console.log('BluetoothManager: Инициализация успешна')
  }

  public async connect(): Promise<void> {
    console.log('BluetoothManager: Попытка подключения')
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth не поддерживается в этом браузере')
      }

      this.isConnecting.value = true
      this.error.value = null

      console.log('BluetoothManager: Запрос устройства')
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: '' }],
        optionalServices: [this.SERVICE_UUID],
      })
      console.log('BluetoothManager: Устройство выбрано')

      console.log('BluetoothManager: Подключение к GATT')
      const gatt = this.device.gatt
      if (!gatt) throw new Error('GATT недоступен')
      this.server = await gatt.connect()
      if (!this.server) throw new Error('Не удалось подключиться к GATT серверу')
      console.log('BluetoothManager: Подключено к GATT')

      console.log('BluetoothManager: Получение сервиса')
      const service = await this.server.getPrimaryService(this.SERVICE_UUID)
      console.log('BluetoothManager: Сервис получен')

      console.log('BluetoothManager: Получение характеристики')
      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID)
      console.log('BluetoothManager: Характеристика получена')

      this.isConnected.value = true
      console.log('BluetoothManager: Подключение успешно')

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected)
    } catch (err) {
      console.error('BluetoothManager: Ошибка подключения:', err)
      this.error.value = err instanceof Error ? err.message : 'Неизвестная ошибка'
      throw err
    } finally {
      this.isConnecting.value = false
    }
  }

  public async disconnect(): Promise<void> {
    console.log('BluetoothManager: Отключение')
    try {
      if (this.server?.connected) {
        console.log('BluetoothManager: Отключение от сервера')
        this.server.disconnect()
      }
      this.device = null
      this.server = null
      this.characteristic = null
      this.isConnected.value = false
      console.log('BluetoothManager: Отключение успешно')
    } catch (err) {
      console.error('BluetoothManager: Ошибка отключения:', err)
      this.error.value = err instanceof Error ? err.message : 'Ошибка при отключении'
      throw err
    }
  }

  private onDisconnected = () => {
    console.log('BluetoothManager: Устройство отключено')
    this.isConnected.value = false
    this.error.value = 'Устройство отключено'
  }

  public async sendData(data: ControllerData): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Нет подключения к устройству')
    }

    const encoder = new TextEncoder()
    const jsonString = JSON.stringify(data)
    const encodedData = encoder.encode(jsonString)

    await this.characteristic.writeValue(encodedData)
  }
}
