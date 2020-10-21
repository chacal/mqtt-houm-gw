import { Coap, Mqtt, SensorEvents } from '@chacal/js-utils'
import { EventStream } from 'baconjs'
import { setupDownstairsToilet, setupStorage, setupUpstairsToilet } from './rules'
import setupD101 from './D101'
import setupD107 from './D107'
import setupD104_D108 from './D104_D108'
import setupImpulseListener from './ImpulseListener'
import setupCarHeaterAPI from './CarHeaterAPI'
import { connectHoumWs } from './houm'
import ISensorEvent = SensorEvents.ISensorEvent
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

export type EnvironmentEventStream = EventStream<IEnvironmentEvent>

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtts://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

const OUTSIDE_TEMP_SENSOR_INSTANCE = 'S210'

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

  Coap.updateTiming({
    ackTimeout: 12  // Use 12s ack timeout
  })

  setupUpstairsToilet(sensorEvents)
  setupDownstairsToilet(sensorEvents)
  setupStorage(sensorEvents)
  setupD101(outsideTempEvents, publishThreadDisplayStatus)
  setupD107(outsideTempEvents, publishThreadDisplayStatus)
  setupD104_D108(publishThreadDisplayStatus)
  setupImpulseListener(mqttClient)
  setupCarHeaterAPI()

  function publishThreadDisplayStatus(status: IThreadDisplayStatus) {
    mqttClient.publish(`/sensor/${status.instance}/${status.tag}/state`, JSON.stringify(status), {
      retain: true,
      qos: 1
    })
  }
}

function environmentEventsFrom(sensorEvents: EventStream<ISensorEvent>, instance: string) {
  return sensorEvents.filter(e => SensorEvents.isEnvironment(e) && e.instance === instance) as EnvironmentEventStream
}