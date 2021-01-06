import { CanvasRenderingContext2D, Image } from 'canvas'
import { Duration } from '@js-joda/core'
import { Coap } from '@chacal/js-utils'
import { parse } from 'url'
import { gzipSync } from 'zlib'
import { ForecastItem } from './CityForecasts'
import { EventStream } from 'baconjs'

import { toBinaryImage, toBWRGrayScale } from '@chacal/canvas-render-utils'

import '@js-joda/timezone'

export function eventsWithInterval<T>(interval: Duration, sourceStream: EventStream<T>): EventStream<T> {
  return sourceStream
    .first()
    .merge(sourceStream
      .toProperty()
      .sample(interval.toMillis())
    )
}

export function renderImage(ctx: CanvasRenderingContext2D, img: Buffer, x: number, y: number, w: number, h: number) {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, x, y, w, h)
      resolve()
    }
    image.onerror = err => reject(err)
    image.src = img
  })
}

export function paddedHoursFor(forecast: ForecastItem) {
  return forecast.time.hour().toString().padStart(2, '0')
}

export function sendImageToDisplay(ipv6Destination: string, image: ImageData) {
  return sendCompressedDataToDisplay(ipv6Destination, toBinaryImage(image))
}

export function sendBWRImageToDisplay(ipv6Destination: string, image: ImageData) {
  return sendCompressedDataToDisplay(ipv6Destination, toBWRGrayScale(image))
}

function sendCompressedDataToDisplay(ipv6Destination: string, uncompressed: Buffer) {
  const url = `coap://[${ipv6Destination}]/api/image`
  const payload = gzipSync(uncompressed)
  console.log(`Sending ${payload.length} bytes to ${url}`)
  return Coap.postOctetStream(parse(url), payload, true)
    .catch(e => {
      console.log(`Error while sending ${payload.length} bytes to ${url}`, e)
    })
}

export function getRandomInt(max: number) {
  max = Math.floor(max)
  return Math.floor(Math.random() * (max + 1))
}