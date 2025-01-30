export class OceanData {
  callback: (data: any) => void;

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
    let [port] = await navigator.serial.getPorts();
    if (!port) port = await navigator.serial.requestPort();

    await port.open({ baudRate: 115200 });
    if (!port.readable) return;

    console.log("Opened port:", port);
    const reader = port.readable.getReader();

    let buffer = new Uint8Array(17);
    let bufferIndex = 0;
    let currentByte;
    let lastByte;

    try {
      while (true) {
        const { value, done } = await reader.read();
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
      reader.releaseLock();
      await port.close();
    }
  }
}
