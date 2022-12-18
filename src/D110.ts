import {SensorEvents as SE} from '@chacal/js-utils'
import {combineTemplate, EventStream} from 'baconjs'
import {getRandomInt, sendBWRImageToDisplay} from './utils'
import {getContext, renderRightAdjustedText} from '@chacal/canvas-render-utils'
import {CanvasRenderingContext2D} from "canvas";
import {ChronoUnit, LocalTime} from "@js-joda/core";

const D110_ADDRESS = 'fddd:eeee:ffff:61:43a2:7c55:f229:85ef'
const REAL_DISPLAY_WIDTH = 128
const REAL_DISPLAY_HEIGHT = 296
const DISPLAY_WIDTH = REAL_DISPLAY_HEIGHT
const DISPLAY_HEIGHT = REAL_DISPLAY_WIDTH
const LIVING_ROOM_INSTANCE = 'S205'
const UPSTAIRS_BATHROOM_INSTANCE = 'S216'
const UPSTAIRS_CLOSET_INSTANCE = 'S217'
const DOWNSTAIRS_CLOSET_INSTANCE = 'S218'
const DISPLAY_SELF_INSTANCE = 'D110'

const RENDERING_INTERVAL_MS = 30 * 60000 + getRandomInt(30000)

type EnvironmentStream = EventStream<SE.IEnvironmentEvent>

export default function setupNetworkDisplay(sensorEvents: EventStream<SE.ISensorEvent>) {
  const combinedEvents = createCombinedStream(sensorEvents)
  combinedEvents
      .first()
      .delay(getRandomInt(60000))
      .concat(combinedEvents.sample(RENDERING_INTERVAL_MS))
      .map(v => renderData(
          v.livingRoomTemp.temperature,
          v.upstairsBathroomTemp.temperature,
          v.upstairsClosetTemp.temperature,
          v.downstairsClosetTemp.temperature,
          v.displayStatus.vcc,
          v.displayStatus.parent.latestRssi
      ))
      .onValue(imageData => sendBWRImageToDisplay(D110_ADDRESS, imageData))
}

function createCombinedStream(sensorEvents: EventStream<SE.ISensorEvent>) {
  const displayStatus = sensorEvents.filter(e => SE.isThreadDisplayStatus(e) && e.instance === DISPLAY_SELF_INSTANCE) as EventStream<SE.IThreadDisplayStatus>

  return combineTemplate({
    livingRoomTemp: environmentEvents(sensorEvents, LIVING_ROOM_INSTANCE),
    upstairsBathroomTemp: environmentEvents(sensorEvents, UPSTAIRS_BATHROOM_INSTANCE),
    upstairsClosetTemp: environmentEvents(sensorEvents, UPSTAIRS_CLOSET_INSTANCE),
    downstairsClosetTemp: environmentEvents(sensorEvents, DOWNSTAIRS_CLOSET_INSTANCE),
    displayStatus
  })
}

function environmentEvents(sensorEvents: EventStream<SE.ISensorEvent>, instance: string) {
  return sensorEvents.filter(e => SE.isEnvironment(e) && e.instance === instance) as EnvironmentStream
}

export function renderData(livingRoomTemp: number, upstairsBathroomTemp: number, upstairsClosetTemp: number, downstairsClosetTemp: number, vcc: number, rssi: number) {
  const ctx = getContext(REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT, true)
  ctx.antialias = 'default'

  const labelFont = '16px Roboto500'
  const firstRowLabelY = 18
  const secondRowLabelY = 82
  const firstColumnX = 10
  const secondColumnX = 125

  ctx.font = labelFont
  ctx.fillText('Living room', firstColumnX, firstRowLabelY)
  ctx.fillText('Downs. closet', secondColumnX, firstRowLabelY)
  ctx.fillText('Ups. closet', firstColumnX, secondRowLabelY)
  ctx.fillText('Ups. bathroom', secondColumnX, secondRowLabelY)

  const rowHeight = 37
  const firstRowValueY = firstRowLabelY + rowHeight
  const secondRowValueY = secondRowLabelY + rowHeight
  renderValueWithUnit(ctx, `${livingRoomTemp.toFixed(1)}`, '°C', firstColumnX, firstRowValueY)
  renderValueWithUnit(ctx, `${downstairsClosetTemp.toFixed(1)}`, '°C', secondColumnX, firstRowValueY)
  renderValueWithUnit(ctx, `${upstairsClosetTemp.toFixed(1)}`, '°C', firstColumnX, secondRowValueY)
  renderValueWithUnit(ctx, `${upstairsBathroomTemp.toFixed(1)}`, '°C', secondColumnX, secondRowValueY)

  renderDisplayStatus(ctx, rssi, vcc)

  return ctx.getImageData(0, 0, REAL_DISPLAY_WIDTH, REAL_DISPLAY_HEIGHT)
}

export function renderDisplayStatus(ctx: CanvasRenderingContext2D, rssi: number, vcc: number) {
  const statusFont = '14px Roboto500'
  const thirdColumnMarginRight = 6
  ctx.font = statusFont
  renderRightAdjustedText(ctx, LocalTime.now().truncatedTo(ChronoUnit.MINUTES).toString(), DISPLAY_WIDTH - thirdColumnMarginRight, 18)
  renderRightAdjustedText(ctx, `${rssi}dBm`, DISPLAY_WIDTH - thirdColumnMarginRight, 68)
  renderRightAdjustedText(ctx, `${(vcc / 1000).toFixed(3)}V`, DISPLAY_WIDTH - thirdColumnMarginRight, 118)
}

export function renderValueWithUnit(ctx: CanvasRenderingContext2D, value: string, unit: string, x: number, y: number) {
  const valueFont = '42px RobotoCondensed700'
  const unitFont = '20px Roboto400'

  ctx.font = valueFont
  let meas = ctx.measureText(value)
  ctx.fillText(value, x, y)
  ctx.font = unitFont
  ctx.fillText(unit, x + meas.width + 2, y - 15)
}
