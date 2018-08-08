import { h, app, ActionsType, View } from 'hyperapp'
import { processArrayBuffer } from './audio'

interface State {
  fftSize: number
  scale: number
}

const state: State = {
  fftSize: 4096,
  scale: 0
}

interface Actions {
  setFile(file: File): State
  setFftSize(value: number): State
  setScale(value: number): State
}

const actions: ActionsType<State, Actions> = {
  setFile: (file: File) => state => {
    console.log(file)

    let reader = new FileReader()
    reader.onload = () => {
      processArrayBuffer(reader.result, state.fftSize, state.scale)
    }
    reader.readAsArrayBuffer(file)
    return state
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
