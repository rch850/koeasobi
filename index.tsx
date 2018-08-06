import { h, app } from 'hyperapp'
import { processArrayBuffer } from './audio'

interface State {
  fftSize: number
  scale: number
}
const state: State = {
  fftSize: 4096,
  scale: 0
}

const actions = {
  changeFile: event => (state: State) => {
    let file = (event.target as HTMLInputElement).files[0]
    console.log(file)

    let reader = new FileReader()
    reader.onload = () => {
      processArrayBuffer(reader.result, state.fftSize, state.scale)
    }
    reader.readAsArrayBuffer(file)
    return state
  },
  setFftSize: event => (state: State) => {
    return { fftSize: event.value }
  },
  setScale: event => (state: State) => {
    return { scale: event.value }
  }
}

const view = (state: State, actions) => (
  <div>
    <audio id="player" controls />
    <br />
    <input
      type="file"
      accept="audio/*"
      capture="microphone"
      onchange={event => actions.changeFile(event)}
    />
    <br />
    <label>
      FFT Size:
      <input
        value={state.fftSize}
        oninput={event => {
          const value = Number(event.target.value)
          if (isNaN(value)) return
          actions.setFftSize({ value })
        }}
      />
    </label>
    <br />
    <label>
      Scale:
      <input
        type="number"
        value={state.scale}
        oninput={event => {
          const value = Number(event.target.value)
          if (isNaN(value)) return
          actions.setScale({ value })
        }}
      />
    </label>
    <br />
    <canvas id="canvas" width="512" height="512" />
  </div>
)

app(state, actions, view, document.body)
