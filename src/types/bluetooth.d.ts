interface BluetoothDevice {
  readonly gatt?: BluetoothRemoteGATTServer
  readonly name?: string
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
}

interface BluetoothLEScan {
  stop(): void
  addEventListener(type: string, listener: EventListener): void
}

interface BluetoothLEScanOptions {
  readonly filters: Array<{ namePrefix?: string }>
  readonly acceptAllAdvertisements: boolean
}

interface BluetoothLEScanEvent extends Event {
  device: BluetoothDevice
}

interface BluetoothLEScanEventMap {
  advertisementreceived: BluetoothLEScanEvent
}

interface BluetoothLEScan extends EventTarget {
  addEventListener<K extends keyof BluetoothLEScanEventMap>(
    type: K,
    listener: (this: BluetoothLEScan, ev: BluetoothLEScanEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void
}

interface Bluetooth {
  getAvailability(): Promise<boolean>
  requestLEScan(options: BluetoothLEScanOptions): Promise<BluetoothLEScan>
  requestDevice(options: {
    filters: Array<{ namePrefix: string }>
    optionalServices: string[]
  }): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth: Bluetooth
}
