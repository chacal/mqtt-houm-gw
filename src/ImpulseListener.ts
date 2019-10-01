import { MqttClient } from 'mqtt'
import { createSocket } from 'dgram'
import { SensorEvents } from '@chacal/js-utils'

const LISTEN_PORT = 5555

export default function setupImpulseListener(mqttClient: MqttClient) {
  const server = createSocket('udp4')

  server.on('listening', () => {
    const address = server.address()
    console.log(`UDP server listening on ${address.address}:${address.port}`)
  })

  server.on('error', err => console.log('UDP server error:', err))

  server.on('message', (msg, rinfo) => handleUdpMessage(msg, mqttClient))

  server.bind(LISTEN_PORT)
}

function handleUdpMessage(msg: Buffer, mqttClient: MqttClient) {
  try {
    const json = JSON.parse(msg.toString())
    if (json.instance === undefined) {
      throw new Error(`Missing field "instance" in impulse UDP packet! Packet was: ${msg.toString()}`)
    }

    const event: SensorEvents.IImpulseEvent = {
      instance: json.instance,
      tag: 'i',
      ts: new Date().toISOString()
    }

    mqttClient.publish(`/sensor/${json.instance}/i/state`, JSON.stringify(event))
  } catch (e) {
    console.log(`Invalid impulse event packet! Packet was: ${msg.toString()}`, e)
  }
}
