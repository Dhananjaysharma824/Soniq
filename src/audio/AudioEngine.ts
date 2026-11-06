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
  private beatCooldown = 180 // ms minimum between kick beats
  private fastKick = 0
  private slowKick = 0
  private slowMid = 0
  private peakBass = 0.12
  private peakMid = 0.12
  private peakTreble = 0.08

  // Smoothed perceptual frequency outputs
  private sBass = 0
  private sMid = 0
  private sTreble = 0
  private sAmp = 0

  public analysis: AudioAnalysis = { ...defaultAnalysis }
  public isInitialized = false

  constructor(opts: AudioEngineOptions = {}) {
    this.fftSize = opts.fftSize ?? 2048
    this.smoothing = opts.smoothing ?? 0.20
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
      this.gainNode.gain.value = 0.8
      this.gainNode.connect(this.context.destination)
    }

    if (!this.audioElement) {
      this.audioElement = element ?? new Audio()
      this.audioElement.crossOrigin = 'anonymous'
      this.audioElement.preload = 'auto'
      this.audioElement.muted = false
      if (typeof document !== 'undefined' && !document.getElementById('soniq-audio-element')) {
        this.audioElement.id = 'soniq-audio-element'
        this.audioElement.style.display = 'none'
        document.body.appendChild(this.audioElement)
      }
      this.attachListeners(this.audioElement)
    } else if (element && element !== this.audioElement) {
      this.audioElement = element
      this.audioElement.crossOrigin = 'anonymous'
      this.audioElement.muted = false
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
    if (!this.context) return
    if (this.context.state !== 'running') {
      try {
        await this.context.resume()
      } catch (err) {
        console.warn('AudioContext resume error:', err)
      }
    }
    if (this.audioElement && this.audioElement.muted && (this.gainNode?.gain.value ?? 0.8) > 0) {
      this.audioElement.muted = false
    }
  }

  setVolume(v: number): void {
    const vol = Math.max(0, Math.min(1, v))
    if (this.gainNode) {
      if (this.context && this.context.state === 'running') {
        try {
          this.gainNode.gain.setValueAtTime(vol, this.context.currentTime)
        } catch {
          this.gainNode.gain.value = vol
        }
      } else {
        this.gainNode.gain.value = vol
      }
    }
    if (this.audioElement) {
      this.audioElement.volume = 1.0
      this.audioElement.muted = vol === 0
    }
  }

  getVolume(): number {
    return this.gainNode?.gain.value ?? 1
  }

  loadSource(src: string): void {
    if (!this.audioElement) return
    // Always preserve anonymous CORS so Web Audio can analyze audio streams from CDNs
    if (this.audioElement.crossOrigin !== 'anonymous') {
      this.audioElement.crossOrigin = 'anonymous'
    }
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

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {})
    }

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

    // Dynamic AGC / Adaptive Peak Normalization:
    // Tracks current song volume envelope so quiet tracks (acoustic/vocals) and loud tracks (EDM)
    // both get full, expressive 0.0 to 1.0 dynamic range!
    this.peakBass = Math.max(0.06, Math.max(this.peakBass * 0.996, rawBass))
    this.peakMid = Math.max(0.05, Math.max(this.peakMid * 0.996, rawMid))
    this.peakTreble = Math.max(0.03, Math.max(this.peakTreble * 0.996, rawTreble))

    const normBass = Math.min(1.0, rawBass / this.peakBass)
    const normMid = Math.min(1.0, rawMid / this.peakMid)
    const normTreble = Math.min(1.0, rawTreble / this.peakTreble)

    let sumSq = 0
    for (let i = 0; i < this.waveformData.length; i++) {
      const v = this.waveformData[i]
      sumSq += v * v
    }
    const rawAmp = Math.min(1.0, Math.sqrt(sumSq / this.waveformData.length) * 1.5)

    // Fast, punchy response with natural musical decay
    const attack = 0.88
    const decay = 0.22
    this.sBass += (normBass - this.sBass) * (normBass > this.sBass ? attack : decay)
    this.sMid += (normMid - this.sMid) * (normMid > this.sMid ? attack : decay)
    this.sTreble += (normTreble - this.sTreble) * (normTreble > this.sTreble ? attack : decay)
    this.sAmp += (rawAmp - this.sAmp) * (rawAmp > this.sAmp ? attack : decay)

    // Kick & Rhythm drum frequency band (30Hz to 160Hz)
    const kickEnd = Math.max(3, Math.floor(160 / binHz))
    const rawKick = this.averageRange(this.spectrumData, 1, kickEnd)
    const normKick = Math.min(1.0, rawKick / this.peakBass)

    // Dynamic, reliable beat pulse tracking (never zeros out in soft songs)
    this.slowKick += (normKick - this.slowKick) * 0.08
    const kickTransient = Math.max(0, (normKick - this.slowKick) / (this.slowKick + 0.12))
    const punch = Math.min(1.0, kickTransient * 2.2)

    // Combined instantaneous musical energy across all instruments
    const instantEnergy = Math.min(1.0, normKick * 0.50 + normMid * 0.35 + rawAmp * 0.15)
    const dynamicBeatStrength = Math.min(1.0, punch * 0.65 + instantEnergy * 0.35)

    // Musical envelope with smooth attack and decay
    if (dynamicBeatStrength > this.analysis.beatStrength) {
      this.analysis.beatStrength += (dynamicBeatStrength - this.analysis.beatStrength) * 0.70
    } else {
      this.analysis.beatStrength = Math.max(0, this.analysis.beatStrength * 0.86)
    }

    const now = performance.now()
    let beat = false
    if (punch > 0.30 && now - this.lastBeatTime > this.beatCooldown) {
      beat = true
      this.lastBeatTime = now
    }

    this.analysis.bass = this.sBass
    this.analysis.mid = this.sMid
    this.analysis.treble = this.sTreble
    this.analysis.amplitude = this.sAmp
    this.analysis.beat = beat
    this.analysis.energy = this.sBass * 0.60 + this.sMid * 0.40

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
