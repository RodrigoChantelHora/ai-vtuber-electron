import { VRM } from '@pixiv/three-vrm'

export class LipSyncController {
  private vrm?: VRM
  private audioContext?: AudioContext
  private analyser?: AnalyserNode
  private dataArray?: Uint8Array<ArrayBuffer>
  private smoothAmplitude = 0

  setVRM(vrm?: VRM) {
    this.vrm = vrm
  }

  start(audioElement: HTMLAudioElement) {
    if (!this.vrm) return

    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256

    const source = this.audioContext.createMediaElementSource(audioElement)
    source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as unknown as Uint8Array<ArrayBuffer>
  }

  stop() {
    this.audioContext?.close()
    this.audioContext = undefined
    this.analyser = undefined
    this.dataArray = undefined
    this.smoothAmplitude = 0
    this.resetMouth()
  }

  update(delta: number) {
    if (!this.analyser || !this.dataArray || !this.vrm?.expressionManager) return

    this.analyser.getByteFrequencyData(this.dataArray)

    let sum = 0
    for (let i = 2; i < this.dataArray.length; i++) {
      sum += this.dataArray[i]
    }
    const amplitude = sum / this.dataArray.length / 255

    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * Math.min(1, delta * 12)

    const open = Math.min(1, this.smoothAmplitude * 2.5)
    this.vrm.expressionManager.setValue('aa', Math.max(0, open * 0.8 - 0.1))
    this.vrm.expressionManager.setValue('ih', Math.max(0, open * 0.5 - 0.3))
    this.vrm.expressionManager.setValue('ou', Math.max(0, open * 0.7 - 0.2))
  }

  private resetMouth() {
    if (!this.vrm?.expressionManager) return
    this.vrm.expressionManager.setValue('aa', 0)
    this.vrm.expressionManager.setValue('ih', 0)
    this.vrm.expressionManager.setValue('ou', 0)
  }
}
