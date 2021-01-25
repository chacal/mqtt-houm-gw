import { Coap, Mqtt, SensorEvents } from '@chacal/js-utils'
import { EventStream } from 'baconjs'
import { setupDownstairsToilet, setupStorage, setupUpstairsToilet } from './rules'
import setupD101 from './D101'
import setupD107 from './D107'
import setupD104_D108 from './D104_D108'
import setupD109 from './D109'
import setupImpulseListener from './ImpulseListener'
import setupCarHeaterAPI from './CarHeaterAPI'
import { connectHoumWs } from './houm'
import { createElectricityPricesStream } from './ElectricityPrices'
import ISensorEvent = SensorEvents.ISensorEvent
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

export type EnvironmentEventStream = EventStream<IEnvironmentEvent>
export type DisplayStatusStream = EventStream<IThreadDisplayStatus>

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtts://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

const OUTSIDE_TEMP_SENSOR_INSTANCE = 'S222'

main()

function main() {
  const mqttClient = Mqtt.startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
  mqttClient.subscribe('/sensor/+/+/state')
  connectHoumWs()

  const sensorEvents: EventStream<ISensorEvent> = Mqtt.messageStreamFrom(mqttClient)
    .map(msg => {
      try {
        return JSON.parse(msg.toString())
      } catch {
        console.error('Got invalid sensor event: ' + msg.toString())
        return null
      }
    })
    .filter(e => e !== null)

  const outsideTempEvents = environmentEventsFrom(sensorEvents, OUTSIDE_TEMP_SENSOR_INSTANCE)
  const displayStatuses = displayStatusesFrom(sensorEvents)
  const electricityPrices = createElectricityPricesStream()


  Coap.updateTiming({
    ackTimeout: 12  // Use 12s ack timeout
  })

  setupUpstairsToilet(sensorEvents)
  setupDownstairsToilet(sensorEvents)
  setupStorage(sensorEvents)
  setupD101(outsideTempEvents, displayStatuses)
  setupD107(outsideTempEvents, displayStatuses)
  setupD104_D108(displayStatuses, electricityPrices)
  setupD109(displayStatuses, electricityPrices, outsideTempEvents)
  setupImpulseListener(mqttClient)
  setupCarHeaterAPI()
}

function environmentEventsFrom(sensorEvents: EventStream<ISensorEvent>, instance: string) {
  return sensorEvents.filter(e => SensorEvents.isEnvironment(e) && e.instance === instance) as EnvironmentEventStream
}

function displayStatusesFrom(sensorEvents: EventStream<ISensorEvent>) {
  return sensorEvents.filter(e => SensorEvents.isThreadDisplayStatus(e)) as DisplayStatusStream
}