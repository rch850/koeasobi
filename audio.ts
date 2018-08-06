import FFT from 'fft.js'

const audioCtx = new window.AudioContext()

export function processArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fftSize: number,
  scale: number
) {
  audioCtx.decodeAudioData(arrayBuffer).then(
    decodedData => {
      console.log(decodedData)

      // process buffer and play it.
      let source = audioCtx.createBufferSource()
      source.buffer = processAudioBuffer(decodedData, fftSize, scale)
      source.connect(audioCtx.destination)
      source.start()
    },
    error => {
      console.error(error)
    }
  )
}

function processAudioBuffer(
  audioBuffer: AudioBuffer,
  fftSize: number,
  scale: number
): AudioBuffer {
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
    const ratio = 1.059463094
    const chunkCount = Math.floor(channelData.length / fftSize)

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

      const spectrumNew = f.createComplexArray()
      for (let i = 0; i < spectrum.length; i++) {
        spectrumNew[Math.floor(i * Math.pow(ratio, scale))] = spectrum[i]
      }

      f.completeSpectrum(spectrumNew)
      // console.log(spectrumNew)

      // draw spectrum
      for (let y = 0; y < spectrumNew.length; y += 2) {
        const yy = Math.floor((y / (fftSize * 2)) * 512)
        myImageData.data[(yy * 512 + chunk) * 4] += spectrumNew[y] * 10
        myImageData.data[(yy * 512 + chunk) * 4 + 3] = 255
      }
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 0] = 255
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 1] = 255
      myImageData.data[(maxInfo.freq * 512 + chunk) * 4 + 2] = 255
      // console.log(`${maxInfo.freq} => ${maxInfo.value}`)

      const resultComplex = f.createComplexArray()
      f.inverseTransform(resultComplex, spectrumNew)
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
