import { h, app, ActionsType, View } from 'hyperapp'
import { processArrayBuffer } from './audio'

interface State {
  fftSize: number
  scale: number
  sourceNode?: AudioBufferSourceNode
}

const state: State = {
  fftSize: 4096,
  scale: 0
}

interface Actions {
  setFile(file: File): State
  setProcessResult(sourceNode: AudioBufferSourceNode): State
  setFftSize(value: number): State
  setScale(value: number): State
}

const actions: ActionsType<State, Actions> = {
  setFile: (file: File) => (state, actions) => {
    console.log(file)

    let reader = new FileReader()
    reader.onload = () => {
      if (state.sourceNode) state.sourceNode.stop()
      processArrayBuffer(reader.result, state.fftSize, state.scale).then(
        result => {
          actions.setProcessResult(result.sourceNode)
        }
      )
    }
    reader.readAsArrayBuffer(file)
    return state
  },
  setProcessResult: (sourceNode: AudioBufferSourceNode) => state => {
    return { sourceNode }
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
    <audio id="player" controls />

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
