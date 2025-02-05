export class OceanData {
  callback: (data: any) => void;

  port: SerialPort | null = null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  constructor(callback: (data: any) => void) {
    this.callback = callback;
  }

  parseBuffer(value: Uint8Array) {
    const view = new DataView(value.buffer);

    let data = {
      index: view.getUint8(0),
      yaw: view.getInt16(1, true) * 0.01,
      pitch: view.getInt16(3, true) * 0.01,
      roll: view.getInt16(5, true) * 0.01,
      xAcceleration: view.getInt16(7, true),
      yAcceleration: view.getInt16(9, true),
      zAcceleration: view.getInt16(11, true),
      mi: view.getUint8(13),
      mr: view.getUint8(14),
      reserved: view.getUint8(15),
      checksum: view.getUint8(16),
    };

    this.callback?.(data);
  }

  async startData() {
    try {
      this.port = await navigator.serial.getPorts().then((ports) => {
        if (!ports.length) {
          return navigator.serial.requestPort({});
        }
        // Port is available
        return ports[0];
      });

      if (this.port) {
        await this.port.open({ baudRate: 115200 });
        this.reader = this.port.readable!.getReader();
      }
    } catch (error) {
      console.error("Error connecting to serial port:", error);
      return;
    }

    if (!this.reader) return;

    let buffer = new Uint8Array(17);
    let bufferIndex = 0;
    let currentByte;
    let lastByte;

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;

        for (let i = 0; i < value.byteLength; i++) {
          currentByte = value[i];

          if (currentByte == 0xaa && lastByte == 0xaa) {
            // console.log("Start of packet");
            bufferIndex = 0;
            continue;
          }

          buffer[bufferIndex] = currentByte;

          if (bufferIndex == 16) {
            // console.log("End of packet");
            this.parseBuffer(buffer);
          }

          bufferIndex++;
          lastByte = currentByte;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    }
  }
}
