import React, { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { loadSound } from './lib/loadSound'
import { dataURLForWaveform } from './lib/waveform'

const sampleSize = 1024
const audioContext = new AudioContext()

// A clip of audio
class AudioClip {
  readonly buffer: AudioBuffer
  readonly duration: number // seconds
  readonly length: number // frames
  readonly numberOfChannels: number
  readonly sampleRate: number

  startOffsetSec: number = 0 // on the timeline, the x position
  name: string

  constructor(buffer: AudioBuffer, name: string = 'untitled') {
    this.buffer = buffer
    this.duration = buffer.duration
    this.length = buffer.length
    this.sampleRate = buffer.sampleRate
    this.numberOfChannels = buffer.numberOfChannels
    this.name = name
  }

  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: { dims: [number, number]; data: string } = {
    dims: [0, 0],
    data: '',
  }
  getWaveformDataURL(width: number, height: number) {
    const {
      dims: [w, h],
      data,
    } = this.memodWaveformDataURL
    if (width === w && height === h) {
      return data
    }
    const waveform = dataURLForWaveform(width, height, this.buffer)
    this.memodWaveformDataURL = { dims: [width, height], data: waveform }
    console.log('generated waveform for', this.name)
    return waveform
  }

  static async fromURL(url: string) {
    const buffer = await loadSound(audioContext, url)
    return new AudioClip(buffer, url)
  }
}

class AnalizedPlayer {
  amplitudeArray: Uint8Array = new Uint8Array()
  sourceNode: AudioBufferSourceNode = audioContext.createBufferSource()
  analyserNode = audioContext.createAnalyser()
  javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1)
  isAudioPlaying: boolean = false

  canvasCtx: CanvasRenderingContext2D | null = null
  onFrame: ((playbackTime: number) => void) | null = null

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0

  drawTimeDomain(
    amplitudeArray: Uint8Array,
    playbackTime: number,
    buffer: AudioBuffer,
  ) {
    const ctx = this.canvasCtx
    if (ctx == null) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    for (let i = 0; i < amplitudeArray.length; i++) {
      let value = amplitudeArray[i] / CANVAS_HEIGHT
      let y = CANVAS_HEIGHT - CANVAS_HEIGHT * value - 1
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(i, y, 1, 1)
    }
    ctx.font = '20px Helvetica'
    ctx.fillText(String(playbackTime), 20, 20)

    const playbackPercent = playbackTime / buffer.duration

    ctx.fillRect(playbackPercent * CANVAS_WIDTH, 0, 1, CANVAS_HEIGHT)

    ctx.fillStyle = '#00ff00'
    const cursorPercent = this.cursorPos / buffer.duration
    ctx.fillRect(cursorPercent * CANVAS_WIDTH, 0, 1, CANVAS_HEIGHT)
  }

  playSound(
    buffer: AudioBuffer,
    drawTimeDomain?: (
      amplitudeArray: Uint8Array,
      playbackTime: number,
      buffer: AudioBuffer,
      player: AnalizedPlayer,
    ) => void,
  ) {
    // Set up nodes, since not all of them can be re-used
    this.sourceNode = audioContext.createBufferSource()
    this.analyserNode = audioContext.createAnalyser()
    this.javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1)

    // Set up the audio Analyser, the Source Buffer and javascriptNode
    // Create the array for the data values  // array to hold time domain data
    this.amplitudeArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    // Now connect the nodes together
    this.sourceNode.connect(audioContext.destination)
    this.sourceNode.connect(this.analyserNode)
    this.analyserNode.connect(this.javascriptNode)
    this.javascriptNode.connect(audioContext.destination)

    const cursorAtPlaybackStart = this.cursorPos

    // setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw the results
    this.javascriptNode.onaudioprocess = () => {
      // get the Time Domain data for this sample
      this.analyserNode.getByteTimeDomainData(this.amplitudeArray)
      // draw the display if the audio is playing

      if (this.isAudioPlaying === true) {
        requestAnimationFrame(() => {
          const timePassed = audioContext.currentTime - this.CTX_PLAY_START_TIME
          const currentTimeInBuffer = cursorAtPlaybackStart + timePassed
          this.drawTimeDomain(this.amplitudeArray, currentTimeInBuffer, buffer)
          if (this.onFrame) this.onFrame(currentTimeInBuffer)
        })
      } else {
        console.log('NOTHING')
      }
    }

    this.CTX_PLAY_START_TIME = audioContext.currentTime
    this.sourceNode.buffer = buffer
    this.sourceNode.start(0, this.cursorPos) // Play the sound now
    this.isAudioPlaying = true
    this.sourceNode.loop = false
  }

  stopSound() {
    this.sourceNode.stop(0)
    this.isAudioPlaying = false
    this.sourceNode.disconnect(audioContext.destination)
    this.sourceNode.disconnect(this.analyserNode)
    this.analyserNode.disconnect(this.javascriptNode)
    this.javascriptNode.disconnect(audioContext.destination)
  }

  cursorPos: number = 0
  setCursorPos(seconds: number) {
    console.log('setting', seconds)
    this.cursorPos = seconds
  }
}

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 256

const PROJECT_WIDTH_PX = 900
const PROJECT_WIDTH_SECS = 90


// from https://stackoverflow.com/questions/57155167/web-audio-api-playing-synchronized-sounds
function mixDown(
  clipList: Array<AudioClip>,
  numberOfChannels = 2,
) {
  // TODO: make start offset aware, so not all clips start at 0:00

  let totalLength = 0
  for (let clip of clipList) {
    const framesOffset = (clip.startOffsetSec * clip.sampleRate) >> 0;
    const end = clip.length + framesOffset;
    if (end > totalLength) {
      totalLength = end
    }
  }

  //create a buffer using the totalLength and sampleRate of the first buffer node
  let finalMix = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    clipList[0].sampleRate,
  )

  //first loop for buffer list
  for (let i = 0; i < clipList.length; i++) {
    const clip = clipList[i];
    const framesOffset = (clip.startOffsetSec * clip.sampleRate) >> 0;
    // second loop for each channel ie. left and right
    for (let channel = 0; channel < numberOfChannels; channel++) {
      //here we get a reference to the final mix buffer data
      let buffer = finalMix.getChannelData(channel)

      //last is loop for updating/summing the track buffer with the final mix buffer
      for (let j = 0; j < clip.length; j++) {
        buffer[j + framesOffset] += clip.buffer.getChannelData(channel)[j]
      }
    }
  }

  return finalMix
}

function App() {
  // const [ctx, setCtx] = useState<null | CanvasRenderingContext2D>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null)
  const playbackPosDiv = useRef<null | HTMLDivElement>(null)
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  // const [audioBuffer, setAudioBuffer] = useState<null | AudioBuffer>(null);
  const [player] = useState(new AnalizedPlayer())
  const [clips, setClips] = useState<Array<AudioClip>>([])
  const [_, setStateCounter] = useState<number>(0)

  const togglePlayback = useCallback(function togglePlayback() {
    if (isAudioPlaying) {
      player.stopSound()
      setIsAudioPlaying(false)
    } else {
      setIsAudioPlaying(true)
    }
  }, [isAudioPlaying, player])

  useEffect(
    function () {
      if (!projectDiv) {
        return
      }

      const mouseDownEvent = function (e: MouseEvent) {
        // On a child element
        if (e.target !== e.currentTarget) {
          // drag clips around




        } 
        
        // On the project div element
        else {
          const div = e.currentTarget
          if (!(div instanceof HTMLDivElement)) return
          const position = {
            x: e.clientX - div.getBoundingClientRect().x,
            y: e.clientY - div.getBoundingClientRect().y,
          }


  
          const posPercentage = position.x / PROJECT_WIDTH_PX
          const asSecs = PROJECT_WIDTH_SECS * posPercentage
          player.setCursorPos(asSecs)
          setCursorPos(asSecs)
        }

 
      }

      projectDiv.addEventListener('mousedown', mouseDownEvent)
      return () => projectDiv.removeEventListener('mousedown', mouseDownEvent)
    },
    [player, projectDiv],
  )

  useEffect(
    function () {
      function keypressEvent(e: KeyboardEvent) {
        if (e.code === 'Space') {
          togglePlayback()
        }
      }

      document.addEventListener('keypress', keypressEvent)
      return function () {
        document.removeEventListener('keypress', keypressEvent)
      }
    },
    [togglePlayback],
  )

  useEffect(
    function () {
      player.onFrame = function (playbackTime) {
        const pbdiv = playbackPosDiv.current
        if (pbdiv) {
          pbdiv.style.left =
            String(playbackTime * (PROJECT_WIDTH_PX / PROJECT_WIDTH_SECS)) +
            'px'
        }
      }
    },
    [player],
  )

  useEffect(
    function () {
      if (clips.length < 1) {
        console.log('NO AUDIO BUFFER')
        return
      }
      if (isAudioPlaying === false) {
        return
      }
      if (isAudioPlaying === true) {
        console.log('PLAY')
        const mixBuffer = mixDown(clips, 2)
        player.playSound(mixBuffer)
      }
    },
    [clips, isAudioPlaying, player],
  )

  async function loadClip(url: string) {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url)
      const newClips = clips.concat([clip])
      setClips(newClips)
      console.log('loaded')
    } catch (e) {
      console.trace(e)
      return
    }
  }

  return (
    <div className="App">
      <div
        ref={(elem) => {
          // if (!elem) return;
          // tDivRef.current = elem;
          // requestAnimationFrame(function drawTime() {
          //   elem.innerText = String(audioContext.currentTime);
          //   requestAnimationFrame(drawTime);
          // });
        }}
      ></div>
      <canvas
        style={{ background: 'black' }}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={(canvas) => {
          if (canvas == null) {
            return
          }
          const ctx = canvas.getContext('2d')
          player.canvasCtx = ctx
          // setCtx();
          ctxRef.current = ctx
        }}
        onClick={function (e) {
          const audioBuffer = clips[0] && clips[0].buffer
          if (isAudioPlaying || !audioBuffer) {
            return
          }
          const canvas = e.target
          if (!(canvas instanceof HTMLCanvasElement)) return
          const position = {
            x: e.clientX - canvas.getBoundingClientRect().x,
            y: e.clientY - canvas.getBoundingClientRect().y,
          }

          player.setCursorPos(
            audioBuffer.duration * (position.x / CANVAS_WIDTH),
          )
          setCursorPos(audioBuffer.duration * (position.x / CANVAS_WIDTH))
        }}
      ></canvas>
      <br />
      <button disabled={clips.length === 0} onClick={togglePlayback}>
        {isAudioPlaying ? 'stop' : 'start'}
      </button>

      <br />
      {[
        'viper.mp3',
        'drums.mp3',
        'clav.mp3',
        'bassguitar.mp3',
        'horns.mp3',
        'leadguitar.mp3',
      ].map(function (url, i) {
        return (
          <button
            key={i}
            onClick={async function () {
              loadClip(url)
            }}
          >
            load {url}
          </button>
        )
      })}

      {/* The whole width of this div is 90s */}
      <div
        ref={(elem) => setProjectDiv(elem)}
        style={{
          position: 'relative',
          background: '#eeeeee',
          width: PROJECT_WIDTH_PX,
          paddingBottom: 20,
          overflowX: 'scroll',
        }}
      >
        {clips.map(function (clip, i) {
          const width = (PROJECT_WIDTH_PX / PROJECT_WIDTH_SECS) * clip.duration
          const height = 20
          return (
            <div
              onClick={function () {
                clip.startOffsetSec += 1;
                setStateCounter(x => x + 1)
              }}
            
              key={i}
              style={{
                background: '#ccffcc',
                backgroundImage:
                  "url('" + clip.getWaveformDataURL(width, height) + "')",
                width,
                height,
                userSelect: 'none',
                border: '1px solid #bbeebb',
                position: 'relative',
                color: 'white',
                left:
                  clip.startOffsetSec * (PROJECT_WIDTH_PX / PROJECT_WIDTH_SECS),
              }}
            >
              <span style={{ color: 'white', background: 'black' }}>
                {clip.name}
              </span>
            </div>
          )
        })}
        <div
          // ref={cursorPosDiv}
          style={{
            background: 'green',
            width: '1px',
            height: '100%',
            position: 'absolute',
            left: cursorPos * (PROJECT_WIDTH_PX / PROJECT_WIDTH_SECS),
            top: 0,
          }}
        ></div>
        <div
          ref={playbackPosDiv}
          style={{
            background: 'red',
            width: '1px',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        ></div>
      </div>
    </div>
  )
}

export default App
