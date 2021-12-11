import { ImpulseStream } from './index'
import { MqttClient } from 'mqtt'
import { EventStream, later } from 'baconjs'
import { SensorEvents } from '@chacal/js-utils'
import ISensorEvent = SensorEvents.ISensorEvent
import IElectricEnergyEvent = SensorEvents.IElectricEnergyEvent

const ELECTRICITY_IMPULSE_INSTANCE = 'I100'

export default function setupEnergyListener(sensorEvents: EventStream<ISensorEvent>, mqttClient: MqttClient) {
  const electricityImpulseEvents = impulseEventsFrom(sensorEvents, ELECTRICITY_IMPULSE_INSTANCE)
  const electricEnergyEvents = sensorEvents.filter(e => SensorEvents.isElectricEnergy(e) && e.instance === ELECTRICITY_IMPULSE_INSTANCE) as EventStream<IElectricEnergyEvent>

  currentEnergyEventOrZeroEvent(electricEnergyEvents)
    .flatMapFirst(e => electricityImpulseEvents
      // Each impulse denotes 1Wh of used energy -> increment energy event's energyAmount by 1 and publish it
      .scan(e, (a, b) => createEnergyEvent(ELECTRICITY_IMPULSE_INSTANCE, a.energyAmount + 1))
    )
    .onValue(e => publishTo(mqttClient, e))
}


function impulseEventsFrom(sensorEvents: EventStream<ISensorEvent>, instance: string) {
  return sensorEvents.filter(e => SensorEvents.isImpulseEvent(e) && e.instance === instance) as ImpulseStream
}

function currentEnergyEventOrZeroEvent(energyEvents: EventStream<IElectricEnergyEvent>): EventStream<IElectricEnergyEvent> {
  return energyEvents    // Wait 5s for an energy event for instance or return an energy event with 0 amp hours
    .merge(later(5000, createEnergyEvent(ELECTRICITY_IMPULSE_INSTANCE, 0)))
    .first()
}

function createEnergyEvent(instance: string, energyAmount: number): IElectricEnergyEvent {
  return {
    tag: 'e',
    instance,
    energyAmount,
    ts: new Date().toISOString()
  }
}

function publishTo(mqttClient: MqttClient, event: IElectricEnergyEvent) {
  mqttClient.publish(`/sensor/${event.instance}/${event.tag}/state`, JSON.stringify(event), { retain: true, qos: 1 })
}
