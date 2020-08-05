import { CanvasRenderingContext2D, Image } from 'canvas'
import { ZonedDateTime, LocalTime, ZoneId, Duration } from 'js-joda'
import { Coap } from '@chacal/js-utils'
import { parse } from 'url'
import { gzipSync } from 'zlib'
import { EnvironmentEventStream } from './index'
import { ForecastItem } from './CityForecasts'

import { getDefaultContext, getTextCenter, toBinaryImage, toBWRGrayScale } from '@chacal/canvas-render-utils'

require('js-joda-timezone')

export function environmentsWithInterval(interval: Duration, environmentEvents: EnvironmentEventStream): EnvironmentEventStream {
  return environmentEvents
    .first()
    .merge(environmentEvents
      .toProperty()
      .sample(interval.toMillis())
    )
}

export function localTimeFor(timestamp: string): LocalTime {
  return ZonedDateTime
    .parse(timestamp)
    .withZoneSameInstant(ZoneId.of('Europe/Helsinki'))
    .toLocalTime()
}

export function renderCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillText(text, x - getTextCenter(ctx, text).x, y)
}

export function renderRightAdjustedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const t = ctx.measureText(text)
  ctx.fillText(text, x - t.width, y)
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

export function getContext(w: number, h: number, rotate: boolean = false) {
  const ctx = getDefaultContext(w, h)
  if (rotate) {
    ctx.translate(w, 0)
    ctx.rotate(90 * Math.PI / 180)
  }
  return ctx
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
  return Coap.postOctetStream(parse(url), payload, false)
}

export function getRandomInt(max: number) {
  max = Math.floor(max)
  return Math.floor(Math.random() * (max + 1))
}