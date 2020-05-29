import { Coap, Mqtt, SensorEvents } from '@chacal/js-utils'
import { EventStream } from 'baconjs'
import { setupDownstairsToilet, setupStorage, setupUpstairsToilet } from './rules'
import setupD101 from './D101'
import setupD104 from './D104'
import setupImpulseListener from './ImpulseListener'
import setupCarHeaterAPI from './CarHeaterAPI'
import { connectHoumWs } from './houm'
import ISensorEvent = SensorEvents.ISensorEvent
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus
import IEnvironmentEvent = SensorEvents.IEnvironmentEvent

export type EnvironmentEventStream = EventStream<IEnvironmentEvent>

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

const OUTSIDE_TEMP_SENSOR_INSTANCE = 'S210'
const CAR_TEMP_SENSOR_INSTANCE = 'S215'

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
  const carTempEvents = environmentEventsFrom(sensorEvents, CAR_TEMP_SENSOR_INSTANCE)

  Coap.updateTiming({
    ackTimeout: 30  // Use 30s ack timeout
  })

  setupUpstairsToilet(sensorEvents)
  setupDownstairsToilet(sensorEvents)
  setupStorage(sensorEvents)
  setupD101(outsideTempEvents, publishThreadDisplayStatus)
  // Not used for now
  // setupD104(carTempEvents, publishThreadDisplayStatus)
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