import {Mqtt, SensorEvents} from '@chacal/js-utils'
import {setupUpstairsToilet, setupDownstairsToilet} from './rules'
import setupD100 from './D100'
import setupD101 from './D101'
import setupD102 from './D102'
import ISensorEvent = SensorEvents.ISensorEvent
import ITemperatureEvent = SensorEvents.ITemperatureEvent
import IThreadDisplayStatus = SensorEvents.IThreadDisplayStatus

export type TempEventStream = Bacon.EventStream<any, ITemperatureEvent>

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

const OUTSIDE_TEMP_SENSOR_INSTANCE = 'S210'


const mqttClient = Mqtt.startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
mqttClient.subscribe('/sensor/+/+/state')


const sensorEvents = Mqtt.messageStreamFrom(mqttClient)
  .map(msg => JSON.parse(msg.toString()) as ISensorEvent)

const outsideTempEvents = sensorEvents.filter(e => SensorEvents.isTemperature(e) && e.instance === OUTSIDE_TEMP_SENSOR_INSTANCE) as TempEventStream

setupUpstairsToilet(sensorEvents)
setupDownstairsToilet(sensorEvents)
setupD100(outsideTempEvents, publishThreadDisplayStatus)
setupD101(outsideTempEvents, publishThreadDisplayStatus)
setupD102(outsideTempEvents, publishThreadDisplayStatus)


function publishThreadDisplayStatus(status: IThreadDisplayStatus) {
  mqttClient.publish(`/sensor/${status.instance}/${status.tag}/state`, JSON.stringify(status))
}