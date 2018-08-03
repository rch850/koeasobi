import FFT from 'fft.js'

import { h, app } from 'hyperapp'

const state = {
  fftSize: 4096
}

const actions = {
  changeFile: event => state => {
    let file = (event.target as HTMLInputElement).files[0]
    console.log(file)

    let reader = new FileReader()
    reader.onload = () => {
      processArrayBuffer(reader.result)
    }
    reader.readAsArrayBuffer(file)
    return state
  },
  setFftSize: event => state => {
    return { fftSize: event.value }
  }
}

const view = (state, actions) => (
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
        oninput={event => actions.setFftSize({ value: event.target.value })}
      />
    </label>
    <br />
    <canvas id="canvas" width="512" height="512" />
  </div>
)

app(state, actions, view, document.body)

//---

const audioCtx = new window.AudioContext()

function processArrayBuffer(arrayBuffer: ArrayBuffer) {
  audioCtx.decodeAudioData(arrayBuffer).then(
    decodedData => {
      console.log(decodedData)

      // process buffer and play it.
      let source = audioCtx.createBufferSource()
      source.buffer = processBuffer(decodedData)
      source.connect(audioCtx.destination)
      source.start()
    },
    error => {
      console.error(error)
    }
  )
}

function processBuffer(audioBuffer: AudioBuffer): AudioBuffer {
  console.log(audioBuffer.length)

  const canvas = document.querySelector('canvas')
  const canvasContext = canvas.getContext('2d')

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    let channelData = audioBuffer.getChannelData(channel)
    console.log(channelData.length)

    // mute other channels than 1st.
    if (channel !== 0) {
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = 0
      }
      continue
    }

    const myImageData = canvasContext.createImageData(512, 512)
    const fftSize = state.fftSize
    const chunkCount = Math.floor(channelData.length / state.fftSize)

    for (let chunk = 0; chunk < chunkCount; chunk++) {
      const f = new FFT(fftSize)
      const inArray = new Array(fftSize)
      for (let i = 0; i < inArray.length; i++) {
        inArray[i] = channelData[i + fftSize * chunk]
      }
      // console.log(inArray)

      const spectrum = f.createComplexArray()
      f.realTransform(spectrum, inArray)

      let maxInfo = { freq: 0, value: 0 }
      for (let i = 0; i < spectrum.length; i++) {
        if (maxInfo.value < spectrum[i]) {
          maxInfo = { freq: i, value: spectrum[i] }
        }
      }

      // const ratio = 1.059463094
      // for (let i = spectrum.length - 1; i >= 0; i--) {
      //     if (i >= 2048) { spectrum[i] = 0 }
      //     if (i < 2048) { spectrum[Math.floor(i * ratio * ratio)] = spectrum[i]; spectrum[i] = 0 }
      // }

      f.completeSpectrum(spectrum)
      // console.log(spectrum)

      // draw spectrum
      for (let y = 0; y < spectrum.length; y += 2) {
        const yy = Math.floor((y / (fftSize * 2)) * 512)
        myImageData.data[(yy * 512 + chunk) * 4] += spectrum[y] * 10
        myImageData.data[(yy * 512 + chunk) * 4 + 3] = 255
      }
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 0] = 255
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 1] = 255
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 2] = 255
      // console.log(`${maxInfo.freq} => ${maxInfo.value}`)

      const resultComplex = f.createComplexArray()
      f.inverseTransform(resultComplex, spectrum)
      const resultReal = f.fromComplexArray(resultComplex)
      // console.log(resultReal)

      for (let i = 0; i < resultReal.length; i++) {
        channelData[i + fftSize * chunk] = resultReal[i]
      }
    }

    canvasContext.putImageData(myImageData, 0, 0)
    console.log('finished')
  }
  return audioBuffer
}
