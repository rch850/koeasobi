import FFT from 'fft.js'

const audioCtx = new window.AudioContext()

export interface ProcessArrayBufferResult {
  source: AudioBuffer
  transformed: AudioBuffer
}

export function processArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fftSize: number,
  scale: number
): Promise<ProcessArrayBufferResult> {
  return audioCtx.decodeAudioData(arrayBuffer).then(decodedData => {
    console.log(decodedData)

    return {
      source: decodedData,
      transformed: processAudioBuffer(decodedData, fftSize, scale)
    }
  })
}

function processAudioBuffer(
  audioBuffer: AudioBuffer,
  fftSize: number,
  scale: number
): AudioBuffer {
  console.log(audioBuffer.length)

  const newAudioBuffer = audioCtx.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  )
  const canvas = document.querySelector('canvas')
  const canvasContext = canvas.getContext('2d')

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    let channelData = audioBuffer.getChannelData(channel)
    let newChannelData = newAudioBuffer.getChannelData(channel)
    console.log(channelData.length)

    // mute other channels than 1st.
    if (channel !== 0) {
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
        newChannelData[i + fftSize * chunk] = resultReal[i]
      }
    }

    canvasContext.putImageData(myImageData, 0, 0)
    console.log('finished')
  }
  return newAudioBuffer
}

// https://stackoverflow.com/a/30045041/1081774
// Convert a audio-buffer segment to a Blob using WAVE representation
export function bufferToWave(
  abuffer: AudioBuffer,
  offset: number,
  len: number
): Blob {
  var numOfChan = abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    i,
    sample,
    pos = 0

  // write WAVE header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"

  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // length = 16
  setUint16(1) // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
  setUint16(numOfChan * 2) // block-align
  setUint16(16) // 16-bit (hardcoded in this demo)

  setUint32(0x61746164) // "data" - chunk
  setUint32(length - pos - 4) // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i))

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0 // scale to 16-bit signed int
      view.setInt16(pos, sample, true) // update data chunk
      pos += 2
    }
    offset++ // next source sample
  }

  // create Blob
  return new Blob([buffer], { type: 'audio/wav' })

  function setUint16(data) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}
