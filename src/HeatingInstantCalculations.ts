import { addDays, format, isAfter, isBefore, parse, startOfMinute, subMinutes } from 'date-fns'

export function nextReadyInstant(readyTime: string, now: Date = new Date()) {
  const readyToday = timeToday(readyTime, now)
  if (isAfter(readyToday, now)) {
    return readyToday
  } else {
    return addDays(readyToday, 1)
  }
}

export function nextHeatingStartInstant(readyTime: string, heatingDuration: number, now: Date = new Date()) {
  const nextReady = nextReadyInstant(readyTime, now)
  const start = subMinutes(nextReady, heatingDuration)
  if (isAfter(start, now)) {
    return start
  } else {
    return addDays(start, 1)
  }
}

export function isHeating(readyTime: string, heatingDuration: number, now: Date = new Date()) {
  const startForTheNextReady = subMinutes(nextReadyInstant(readyTime, now), heatingDuration)
  return isBefore(startForTheNextReady, now)
}

export function toLocalTimeStr(utcHHmmStr: string) {
  return format(timeToday(utcHHmmStr), 'HH:mm')
}

export function timeToday(utcHHmmStr: string, now: Date = new Date()) {
  return startOfMinute(parse(utcHHmmStr + 'Z', 'HH:mmX', now))
}

export function toUtcHHmm(date: Date) {
  return date.toISOString().substring(11, 16)
}