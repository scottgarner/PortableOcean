import * as Tone from "tone";

export class OceanAudio {
  async startAudio() {
    await Tone.start();

    console.log("Audio is now enabled!");

    // Create brown noise and pink noise.
    const brownNoise = new Tone.Noise("brown").start();
    const pinkNoise = new Tone.Noise("pink").start();

    // Gain nodes for independent volume control.
    const brownGain = new Tone.Gain(0).toDestination();
    const pinkGain = new Tone.Gain(0).toDestination();

    // Connect noises to their respective gain nodes.
    brownNoise.connect(brownGain);
    pinkNoise.connect(pinkGain);

    // LFO for brown noise volume.
    new Tone.LFO({
      type: "sine",
      min: 0.2,
      max: 0.8,
      frequency: 0.05,
    })
      .connect(brownGain.gain)
      .start();

    // LFO for pink noise volume
    new Tone.LFO({
      type: "sine",
      min: 0.1,
      max: 0.6,
      frequency: 0.08,
    })
      .connect(pinkGain.gain)
      .start();

    // Start the transport
    Tone.start();
  }
}
