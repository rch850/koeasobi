import { h, app, ActionsType, View } from 'hyperapp'
import { processArrayBuffer, bufferToWave } from './audio'

interface State {
  source?: AudioBuffer
  sourceUrl: string
  transformed?: AudioBuffer
  transformedUrl: string
  fftSize: number
  scale: number
}

const state: State = {
  sourceUrl: '',
  transformedUrl: '',
  fftSize: 4096,
  scale: 0
}

interface Actions {
  setFile(file: File): State
  setSourceAudioBuffer(buffer: AudioBuffer): State
  setTransformedAudioBuffer(buffer: AudioBuffer): State
  setFftSize(value: number): State
  setScale(value: number): State
}

const actions: ActionsType<State, Actions> = {
  setFile: (file: File) => (state, actions) => {
    console.log(file)

    let reader = new FileReader()
    reader.onload = () => {
      processArrayBuffer(
        reader.result as ArrayBuffer,
        state.fftSize,
        state.scale
      ).then(result => {
        actions.setSourceAudioBuffer(result.source)
        actions.setTransformedAudioBuffer(result.transformed)
      })
    }
    reader.readAsArrayBuffer(file)
    return state
  },
  setSourceAudioBuffer: (buffer: AudioBuffer) => state => {
    if (state.sourceUrl !== '') {
      URL.revokeObjectURL(state.sourceUrl)
    }
    const url = URL.createObjectURL(bufferToWave(buffer, 0, buffer.length))
    return { source: buffer, sourceUrl: url }
  },
  setTransformedAudioBuffer: (buffer: AudioBuffer) => state => {
    if (state.transformedUrl !== '') {
      URL.revokeObjectURL(state.transformedUrl)
    }
    const url = URL.createObjectURL(bufferToWave(buffer, 0, buffer.length))
    return { transformed: buffer, transformedUrl: url }
  },
  setFftSize: (value: number) => state => {
    if (isNaN(value)) return
    return { fftSize: value }
  },
  setScale: (value: number) => state => {
    if (isNaN(value)) return
    return { scale: value }
  }
}

const view: View<State, Actions> = (state, actions) => (
  <div class="section">
    source: <audio controls src={state.sourceUrl} />
    transformed: <audio controls src={state.transformedUrl} />
    <div class="field">
      <input
        type="file"
        accept="audio/*"
        capture="microphone"
        onchange={event => {
          actions.setFile(event.target.files[0])
          event.target.value = ''
        }}
      />
    </div>
    <div class="field">
      <label class="label">FFT Size</label>
      <div class="control">
        <input
          class="input"
          value={state.fftSize}
          oninput={event => {
            actions.setFftSize(Number(event.target.value))
          }}
        />
      </div>
    </div>
    <div class="field">
      <label class="label">Scale</label>
      <div class="control">
        <input
          class="input"
          type="number"
          value={state.scale}
          oninput={event => {
            actions.setScale(Number(event.target.value))
          }}
        />
      </div>
    </div>
    <canvas id="canvas" width="512" height="512" />
  </div>
)

app<State, Actions>(state, actions, view, document.body)
