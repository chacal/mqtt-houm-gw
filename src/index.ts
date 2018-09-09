import {Mqtt, SensorEvents} from '@chacal/js-utils'
import {setupUpstairsToilet, setupDownstairsToilet} from "./rules"
import ISensorEvent = SensorEvents.ISensorEvent

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined

const mqttClient = Mqtt.startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
mqttClient.subscribe('/sensor/+/+/state')

const sensorEvents = Mqtt.messageStreamFrom(mqttClient)
  .map(msg => JSON.parse(msg.toString()) as ISensorEvent)

setupUpstairsToilet(sensorEvents)
setupDownstairsToilet(sensorEvents)
