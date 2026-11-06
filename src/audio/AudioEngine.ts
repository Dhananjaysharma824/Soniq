export interface AudioAnalysis {
  bass: number
  mid: number
  treble: number
  amplitude: number
  waveform: Float32Array
  spectrum: Uint8Array
  beat: boolean
  beatStrength: number
  energy: number
}

export interface AudioEngineOptions {
  fftSize?: number
  smoothing?: number
}

const defaultAnalysis: AudioAnalysis = {
  bass: 0,
  mid: 0,
  treble: 0,
  amplitude: 0,
  waveform: new Float32Array(1024),
  spectrum: new Uint8Array(1024),
  beat: false,
  beatStrength: 0,
  energy: 0,
}

export class AudioEngine {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private audioElement: HTMLAudioElement | null = null
  private fftSize: number
  private smoothing: number
  private spectrumData: Uint8Array = new Uint8Array(0)
  private waveformData: Float32Array = new Float32Array(0)
  private ticker: number | null = null

  // Callbacks for UI sync
  public onTimeUpdate?: (currentTime: number, duration: number) => void
  public onPlayState?: (isPlaying: boolean) => void
  public onTrackEnded?: () => void
  public onBuffering?: (isBuffering: boolean) => void
  public onError?: (msg: string) => void

  // Beat & Transient detection state
  private lastBeatTime = 0
  private beatCooldown = 110 // ms between fast transients
  private energyHistory: number[] = []
  private historySize = 40
  private adaptiveSensitivity = 1.25

  // Smoothed perceptual frequency outputs
  private sBass = 0
  private sMid = 0
  private sTreble = 0
  private sAmp = 0
  private lastEnergy = 0

  public analysis: AudioAnalysis = { ...defaultAnalysis }
  public isInitialized = false

  constructor(opts: AudioEngineOptions = {}) {
    this.fftSize = opts.fftSize ?? 2048
    this.smoothing = opts.smoothing ?? 0.72
  }

  async init(element?: HTMLAudioElement): Promise<HTMLAudioElement> {
    if (!this.context) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.context = new AudioCtx()
    }
    if (this.context.state === 'suspended') {
      await this.context.resume().catch(() => {})
    }

    if (!this.analyser) {
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = this.fftSize
      this.analyser.smoothingTimeConstant = this.smoothing
      this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount)
      this.waveformData = new Float32Array(this.analyser.fftSize)
      this.analysis.spectrum = this.spectrumData
      this.analysis.waveform = this.waveformData
    }

    if (!this.gainNode) {
      this.gainNode = this.context.createGain()
      this.gainNode.connect(this.context.destination)
    }

    if (!this.audioElement) {
      this.audioElement = element ?? new Audio()
      this.audioElement.crossOrigin = 'anonymous'
      this.audioElement.preload = 'auto'
      this.attachListeners(this.audioElement)
    } else if (element && element !== this.audioElement) {
      this.audioElement = element
      this.source = null
      this.attachListeners(this.audioElement)
    }

    if (!this.source && this.audioElement) {
      try {
        this.source = this.context.createMediaElementSource(this.audioElement)
        this.source.connect(this.analyser)
        this.analyser.connect(this.gainNode)
      } catch {
        // MediaElementSource can only be created once per element
      }
    }

    this.isInitialized = true
    return this.audioElement
  }

  private attachListeners(el: HTMLAudioElement) {
    const notifyTime = () => {
      const ct = el.currentTime || 0
      const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0
      if (this.onTimeUpdate) this.onTimeUpdate(ct, dur)
    }

    el.addEventListener('timeupdate', notifyTime)
    el.addEventListener('durationchange', notifyTime)
    el.addEventListener('loadedmetadata', notifyTime)
    el.addEventListener('canplay', () => this.onBuffering?.(false))
    el.addEventListener('play', () => {
      this.startTicker()
      this.onPlayState?.(true)
      this.onBuffering?.(false)
    })
    el.addEventListener('pause', () => {
      this.stopTicker()
      this.onPlayState?.(false)
    })
    el.addEventListener('ended', () => {
      this.stopTicker()
      this.onTrackEnded?.()
    })
    el.addEventListener('waiting', () => this.onBuffering?.(true))
    el.addEventListener('playing', () => {
      this.startTicker()
      this.onBuffering?.(false)
      this.onPlayState?.(true)
    })
    el.addEventListener('error', (e) => {
      console.warn('Audio stream error:', e)
      this.stopTicker()
      this.onBuffering?.(false)
      this.onPlayState?.(false)
      this.onError?.('Audio stream could not be loaded. Try another track or upload an MP3.')
    })
  }

  private startTicker() {
    if (this.ticker) return
    this.ticker = window.setInterval(() => {
      if (this.audioElement && !this.audioElement.paused) {
        const ct = this.audioElement.currentTime || 0
        const dur =
          Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0
            ? this.audioElement.duration
            : 0
        if (this.onTimeUpdate) this.onTimeUpdate(ct, dur)
      }
    }, 120)
  }

  private stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
    }
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement
  }

  getContext(): AudioContext | null {
    return this.context
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume().catch(() => {})
    }
  }

  setVolume(v: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v))
    if (this.audioElement) this.audioElement.volume = 1
  }

  getVolume(): number {
    return this.gainNode?.gain.value ?? 1
  }

  loadSource(src: string): void {
    if (!this.audioElement) return
    this.audioElement.src = src
    this.audioElement.load()
  }

  loadFile(file: File): void {
    if (!this.audioElement) return
    const url = URL.createObjectURL(file)
    this.audioElement.src = url
    this.audioElement.load()
  }

  private averageRange(data: Uint8Array, start: number, end: number): number {
    const s = Math.max(0, Math.floor(start))
    const e = Math.min(data.length, Math.floor(end))
    if (e <= s) return 0
    let sum = 0
    for (let i = s; i < e; i++) sum += data[i]
    return sum / (e - s) / 255
  }

  update(): AudioAnalysis {
    if (!this.analyser || !this.context) return this.analysis

    this.analyser.getByteFrequencyData(this.spectrumData as Uint8Array<ArrayBuffer>)
    this.analyser.getFloatTimeDomainData(this.waveformData as Float32Array<ArrayBuffer>)

    const binCount = this.spectrumData.length
    const nyquist = this.context.sampleRate / 2
    const binHz = nyquist / binCount

    // Perceptual frequency bands
    const bassEnd = Math.max(2, Math.floor(250 / binHz))
    const midEnd = Math.max(bassEnd + 1, Math.floor(3500 / binHz))
    const trebleEnd = Math.max(midEnd + 1, Math.floor(14000 / binHz))

    const rawBass = this.averageRange(this.spectrumData, 1, bassEnd)
    const rawMid = this.averageRange(this.spectrumData, bassEnd, midEnd)
    const rawTreble = this.averageRange(this.spectrumData, midEnd, trebleEnd)

    const perceivedBass = Math.min(1.0, Math.pow(rawBass * 2.2, 0.85))
    const perceivedMid = Math.min(1.0, Math.pow(rawMid * 2.6, 0.85))
    const perceivedTreble = Math.min(1.0, Math.pow(rawTreble * 3.2, 0.9))

    let sumSq = 0
    for (let i = 0; i < this.waveformData.length; i++) {
      const v = this.waveformData[i]
      sumSq += v * v
    }
    const rawAmp = Math.min(1.0, Math.sqrt(sumSq / this.waveformData.length) * 1.8)

    const attack = 0.38
    const decay = 0.14
    this.sBass += (perceivedBass - this.sBass) * (perceivedBass > this.sBass ? attack : decay)
    this.sMid += (perceivedMid - this.sMid) * (perceivedMid > this.sMid ? attack : decay)
    this.sTreble += (perceivedTreble - this.sTreble) * (perceivedTreble > this.sTreble ? attack : decay)
    this.sAmp += (rawAmp - this.sAmp) * (rawAmp > this.sAmp ? attack : decay)

    const instantEnergy = this.sBass * 0.65 + this.sMid * 0.35
    const energyDelta = Math.max(0, instantEnergy - this.lastEnergy)
    this.lastEnergy = instantEnergy

    this.energyHistory.push(instantEnergy)
    if (this.energyHistory.length > this.historySize) this.energyHistory.shift()

    let avg = 0
    for (let i = 0; i < this.energyHistory.length; i++) avg += this.energyHistory[i]
    avg /= this.energyHistory.length || 1

    let variance = 0
    for (let i = 0; i < this.energyHistory.length; i++) {
      const d = this.energyHistory[i] - avg
      variance += d * d
    }
    variance /= this.energyHistory.length || 1

    const dynamicThreshold = avg + Math.sqrt(variance) * this.adaptiveSensitivity
    const threshold = Math.max(0.18, Math.min(0.85, dynamicThreshold))

    const now = performance.now()
    let beat = false
    let beatStrength = 0

    if (
      (instantEnergy > threshold || energyDelta > 0.12) &&
      instantEnergy > 0.12 &&
      now - this.lastBeatTime > this.beatCooldown
    ) {
      beat = true
      beatStrength = Math.min(
        1.0,
        (instantEnergy - threshold) / Math.max(0.01, 1 - threshold) + 0.4 + energyDelta * 1.5,
      )
      this.lastBeatTime = now
    }

    if (!beat) {
      this.analysis.beatStrength *= 0.82
      if (this.analysis.beatStrength < 0.01) this.analysis.beatStrength = 0
    } else {
      this.analysis.beatStrength = Math.max(this.analysis.beatStrength, beatStrength)
    }

    this.analysis.bass = this.sBass
    this.analysis.mid = this.sMid
    this.analysis.treble = this.sTreble
    this.analysis.amplitude = this.sAmp
    this.analysis.beat = beat
    this.analysis.energy = instantEnergy

    return this.analysis
  }

  dispose(): void {
    this.stopTicker()
    try {
      this.source?.disconnect()
      this.analyser?.disconnect()
      this.gainNode?.disconnect()
      this.context?.close()
    } catch {
      /* noop */
    }
    this.context = null
    this.analyser = null
    this.source = null
    this.gainNode = null
    this.isInitialized = false
  }
}

export const audioEngine = new AudioEngine()
