import { MqttClient } from 'mqtt'
import { EventStream } from 'baconjs'
import { SpotPrice } from 'pohjoisallas'
import { getCurrentPrice, retailPrice } from './ElectricityPrices'


export default function setupElectricityPricePublisher(spotPrices: EventStream<SpotPrice[]>, mqttClient: MqttClient) {
  const currentPrices = spotPrices
    .map(prices => getCurrentPrice(prices))
    .filter(p => p !== undefined) as EventStream<SpotPrice>

  currentPrices
    .map(p => retailPrice(p) / 10)  // Convert to c/kWh
    .onValue(e => publishTo(mqttClient, e))
}


function publishTo(mqttClient: MqttClient, price: number) {
  const data = {
    price,
    ts: new Date().toISOString()
  }
  mqttClient.publish(`/nordpool/current_price`, JSON.stringify(data), { retain: true, qos: 1 })
}
