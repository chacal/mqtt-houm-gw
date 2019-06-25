import { ZonedDateTime, LocalTime, ZoneId, Duration } from 'js-joda'
import { TempEventStream } from './index'

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