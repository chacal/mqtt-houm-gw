import { CanvasRenderingContext2D, Image } from 'canvas'
import { ZonedDateTime, LocalTime, ZoneId, Duration } from 'js-joda'
import { CanvasRenderUtils, Coap } from '@chacal/js-utils'
import { parse } from 'url'
import { gzipSync } from 'zlib'
import { TempEventStream } from './index'
import { ForecastItem } from './CityForecasts'

import getDefaultContext = CanvasRenderUtils.getDefaultContext
import getTextCenter = CanvasRenderUtils.getTextCenter
import toBinaryImage = CanvasRenderUtils.toBinaryImage

require('js-joda-timezone')

export function temperaturesWithInterval(interval: Duration, tempEvents: TempEventStream): TempEventStream {
  return tempEvents
    .first()
    .merge(tempEvents
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
  const payload = gzipSync(toBinaryImage(image))
  return Coap.postOctetStream(parse(`coap://[${ipv6Destination}]/api/image`), payload, false)
}