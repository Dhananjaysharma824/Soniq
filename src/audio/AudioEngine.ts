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
  private beatCooldown = 260 // ms - musical tempo cadence (prevents 10Hz buzzing/vibration)
  private energyHistory: number[] = []
  private historySize = 40
  private adaptiveSensitivity = 1.25
  private lastKick = 0

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
    this.smoothing = opts.smoothing ?? 0.45
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

    const perceivedBass = Math.min(1.0, rawBass * 1.35)
    const perceivedMid = Math.min(1.0, rawMid * 1.45)
    const perceivedTreble = Math.min(1.0, rawTreble * 1.65)

    let sumSq = 0
    for (let i = 0; i < this.waveformData.length; i++) {
      const v = this.waveformData[i]
      sumSq += v * v
    }
    const rawAmp = Math.min(1.0, Math.sqrt(sumSq / this.waveformData.length) * 1.3)

    // Fast, zero-lag attack with natural musical decay
    const attack = 0.75
    const decay = 0.22
    this.sBass += (perceivedBass - this.sBass) * (perceivedBass > this.sBass ? attack : decay)
    this.sMid += (perceivedMid - this.sMid) * (perceivedMid > this.sMid ? attack : decay)
    this.sTreble += (perceivedTreble - this.sTreble) * (perceivedTreble > this.sTreble ? attack : decay)
    this.sAmp += (rawAmp - this.sAmp) * (rawAmp > this.sAmp ? attack : decay)

    // Kick drum onset detection (40Hz to 130Hz)
    const kickEnd = Math.max(3, Math.floor(130 / binHz))
    const rawKick = this.averageRange(this.spectrumData, 1, kickEnd)
    const kickDelta = Math.max(0, rawKick - this.lastKick)
    this.lastKick = rawKick

    this.energyHistory.push(rawKick)
    if (this.energyHistory.length > 25) this.energyHistory.shift()

    let kickAvg = 0
    for (let i = 0; i < this.energyHistory.length; i++) kickAvg += this.energyHistory[i]
    kickAvg /= this.energyHistory.length || 1

    const now = performance.now()
    let beat = false

    // Real kick onset: sudden jump above recent baseline + substantial absolute volume
    const isKickOnset = kickDelta > 0.08 && rawKick > kickAvg * 1.35 && rawKick > 0.18
    const isHardPunch = kickDelta > 0.15 && rawKick > 0.22

    if ((isKickOnset || isHardPunch) && now - this.lastBeatTime > this.beatCooldown) {
      beat = true
      this.analysis.beatStrength = 1.0
      this.lastBeatTime = now
    } else {
      this.analysis.beatStrength *= 0.82
      if (this.analysis.beatStrength < 0.01) this.analysis.beatStrength = 0
    }

    this.analysis.bass = this.sBass
    this.analysis.mid = this.sMid
    this.analysis.treble = this.sTreble
    this.analysis.amplitude = this.sAmp
    this.analysis.beat = beat
    this.analysis.energy = this.sBass * 0.75 + this.sMid * 0.25

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
