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
  private leScan: BluetoothLEScan | null = null

  public isConnected = ref<boolean>(false)
  public isConnecting = ref<boolean>(false)
  public error = ref<string | null>(null)

  private readonly SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'
  private readonly CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'
  private readonly DEVICE_NAME = 'DroneController' // точное имя устройства (или используй namePrefix)

  constructor() {
    console.log('BluetoothManager: Инициализация')
    console.log('BluetoothManager: navigator.bluetooth доступен:', !!navigator.bluetooth)
    console.log('BluetoothManager: Протокол:', window.location.protocol)
    console.log('BluetoothManager: Хост:', window.location.hostname)

    if (!navigator.bluetooth) {
      this.error.value = 'Bluetooth не поддерживается в этом браузере'
      console.error(this.error.value)
      return
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      this.error.value = 'Bluetooth доступен только через HTTPS или localhost'
      console.error(this.error.value)
      return
    }
  }

  /**
   * Основной метод подключения.
   * Попытки (в порядке):
   * 1) requestDevice с фильтром по имени (если устройство рекламирует имя в диалоге)
   * 2) requestDevice с acceptAllDevices: true (fallback)
   * 3) (опционально) LE scan -> попытка подключиться к обнаруженному устройству
   */
  public async connect(): Promise<void> {
    console.log('BluetoothManager: Попытка подключения')
    this.isConnecting.value = true
    this.error.value = null

    try {
      if (!navigator.bluetooth) throw new Error('Bluetooth не поддерживается')

      // 1. Попробуем запросить устройство, показывая только устройства с точным именем.
      // Это работает, если устройство сообщает имя. Если диалог пустой или устройство не рекламирует имя,
      // то этот вариант может ничего не показать.
      try {
        console.log('BluetoothManager: Попытка requestDevice с фильтром по имени', this.DEVICE_NAME)
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ name: this.DEVICE_NAME }],
          optionalServices: [this.SERVICE_UUID],
        })
        console.log('BluetoothManager: Устройство выбрано (по имени)', this.device?.name, this.device?.id)
      } catch (errNameFilter) {
        // Если фильтр по имени не сработал (например пользователь отменил диалог или фильтр не нашёл устройств),
        // пробуем более мягкий вариант.
        console.warn('BluetoothManager: requestDevice по имени не удался, пробуем acceptAllDevices. Причина:', errNameFilter)

        console.log('BluetoothManager: requestDevice acceptAllDevices (fallback)')
        this.device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [this.SERVICE_UUID],
        })
        console.log('BluetoothManager: Устройство выбрано (acceptAllDevices)', this.device?.name, this.device?.id)
      }

      if (!this.device) throw new Error('Устройство не выбрано')

      // Подписываемся на событие отключения
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected)

      // Подключаемся к GATT
      const gatt = this.device.gatt
      if (!gatt) throw new Error('GATT недоступен на устройстве')
      this.server = await gatt.connect()
      if (!this.server) throw new Error('Не удалось подключиться к GATT серверу')
      console.log('BluetoothManager: Подключено к GATT')

      // Получаем сервис и характеристику
      const service = await this.server.getPrimaryService(this.SERVICE_UUID)
      if (!service) throw new Error('Сервис не найден на устройстве')
      console.log('BluetoothManager: Сервис получен', this.SERVICE_UUID)

      this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID)
      if (!this.characteristic) throw new Error('Характеристика не найдена')
      console.log('BluetoothManager: Характеристика получена', this.CHARACTERISTIC_UUID)

      this.isConnected.value = true
      console.log('BluetoothManager: Подключение успешно')
    } catch (err) {
      console.error('BluetoothManager: Ошибка подключения:', err)
      this.error.value = err instanceof Error ? err.message : String(err)

      // Если вообще ничего не получилось и есть поддержка requestLEScan — можно попробовать сканировать кратко.
      if (this.canUseLEScan()) {
        console.info('BluetoothManager: Попробуем краткий LE-скан (если поддерживается) чтобы найти устройство в эфире')
        try {
          await this.tryLEScanAndConnect(5000) // скан 5 секунд
        } catch (scanErr) {
          console.warn('BluetoothManager: LE-скан не помог или не поддерживается/выпал:', scanErr)
        }
      }

      throw err
    } finally {
      this.isConnecting.value = false
    }
  }

  /** Отключение */
  public async disconnect(): Promise<void> {
    console.log('BluetoothManager: Отключение')
    try {
      // остановим LE scan, если он работал
      await this.stopLEScanSafe()

      if (this.server && this.server.connected) {
        this.server.disconnect()
        console.log('BluetoothManager: Сервер отключен')
      }

      if (this.device) {
        try {
          this.device.removeEventListener('gattserverdisconnected', this.onDisconnected)
        } catch (e) {
          // игнорируем
        }
      }

      this.device = null
      this.server = null
      this.characteristic = null
      this.isConnected.value = false
      console.log('BluetoothManager: Полное отключение завершено')
    } catch (err) {
      console.error('BluetoothManager: Ошибка при отключении:', err)
      this.error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /** Обработчик отключения */
  private onDisconnected = (ev?: Event) => {
    console.warn('BluetoothManager: Устройство отключилось', ev)
    this.isConnected.value = false
    this.error.value = 'Устройство отключено'
  }

  /** Отправка данных JSON-строкой в характеристику */
  public async sendData(data: ControllerData): Promise<void> {
    if (!this.characteristic) throw new Error('Нет подключения к устройству (характеристика отсутствует)')
    try {
      const encoder = new TextEncoder()
      const jsonString = JSON.stringify(data)
      const encoded = encoder.encode(jsonString)
      console.log('BluetoothManager: Отправка данных:', jsonString)
      await this.characteristic.writeValue(encoded)
    } catch (err) {
      console.error('BluetoothManager: Ошибка при отправке данных:', err)
      throw err
    }
  }

  /** Проверка возможности использования requestLEScan (не во всех браузерах доступно) */
  private canUseLEScan(): boolean {
    // @ts-ignore - requestLEScan экспериментален, может не быть в TS defs
    return typeof (navigator.bluetooth as any).requestLEScan === 'function' && typeof (navigator as any).addEventListener === 'function'
  }

  /**
   * Попытка сделать короткий LE-скан и подключиться к устройству, если оно найдено в рекламе.
   * ВАЖНО: поведение зависит от браузера/платформы. В некоторых случаях после сканирования
   * необходимо всё равно показывать диалог requestDevice для разрешений.
   */
  private async tryLEScanAndConnect(timeoutMs = 5000): Promise<void> {
    if (!this.canUseLEScan()) throw new Error('LE scan не поддерживается в этом браузере')

    // Слушатель реклам
    const onAdvertisement = async (event: BluetoothAdvertisingEvent) => {
      try {
        // event.device — найденный BluetoothDevice
        const advDevice = (event as any).device as BluetoothDevice | undefined
        const name = advDevice?.name ?? (event as any).deviceName ?? event.name
        console.log('BluetoothManager: Реклама получена:', {
          name,
          id: advDevice?.id,
          uuids: advDevice?.uuids ?? event.uuids ?? [],
          rssi: (event as any).rssi,
          manufacturerData: event.manufacturerData,
        })

        // Если имя подходит — пытаемся подключиться напрямую
        if (name && (name === this.DEVICE_NAME || name.startsWith(this.DEVICE_NAME))) {
          console.info('BluetoothManager: Найдено устройство по рекламе, пытаемся подключиться к нему напрямую', name)
          // Если в рекламе есть device, можно попробовать использовать его
          if (advDevice) {
            // Снимаем слушатель, остановим скан
            await this.stopLEScanSafe()
            try {
              this.device = advDevice
              this.device.addEventListener('gattserverdisconnected', this.onDisconnected)
              const gatt = this.device.gatt
              if (!gatt) throw new Error('GATT недоступен')
              this.server = await gatt.connect()
              const service = await this.server.getPrimaryService(this.SERVICE_UUID)
              this.characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID)
              this.isConnected.value = true
              console.log('BluetoothManager: Успешно подключились после LE-скана')
            } catch (connectErr) {
              console.warn('BluetoothManager: Ошибка подключения после LE-скана:', connectErr)
            }
          }
        }
      } catch (e) {
        console.warn('BluetoothManager: Ошибка в обработчике рекламы:', e)
      }
    }

    try {
      // @ts-ignore
      this.leScan = await (navigator.bluetooth as any).requestLEScan({
        keepRepeatedDevices: false,
        // можно добавить фильтры например по name или services, но фильтры в LE scan
        // также зависят от того, что устройство рекламирует.
        // filters: [{ name: this.DEVICE_NAME }, { services: [this.SERVICE_UUID] }]
      })
      console.log('BluetoothManager: LE scan запущен', this.leScan)

      // Слушаем глобальное событие advertisementreceived
      (navigator as any).addEventListener('advertisementreceived', onAdvertisement)

      // Ждём timeoutMs, затем завершаем скан
      await new Promise((res) => setTimeout(res, timeoutMs))

      // Удаляем слушатель
      (navigator as any).removeEventListener('advertisementreceived', onAdvertisement)

      // Если по окончании скана всё ещё нет подключения — остановим скан и выйдем
      await this.stopLEScanSafe()
      console.log('BluetoothManager: LE scan завершён')
    } catch (err) {
      // Попытка запускать LE-scan может провалиться (нет поддержи или нужны флаги)
      console.warn('BluetoothManager: Не удалось запустить LE-скан:', err)
      // Убедимся, что скан остановлен локально
      await this.stopLEScanSafe()
      throw err
    }
  }

  /** Безопасная остановка LE-скана */
  private async stopLEScanSafe(): Promise<void> {
    if (!this.leScan) return
    try {
      this.leScan.stop()
    } catch (e) {
      // игнорируем
    }
    this.leScan = null
  }
}
