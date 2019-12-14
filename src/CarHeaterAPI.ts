import express = require('express')
import { Express } from 'express'
import http from 'http'
import io, { Server, Socket } from 'socket.io'
import { Request, Response } from 'express-serve-static-core'
import { houmSiteStream, turnOff, turnOn } from './houm'
import { Lights } from './Lights'
import CarHeaterService from './CarHeaterService'
import CarHeaterState from './CarHeaterState'
import { find, identity } from 'lodash'

const PORT = 4000
const STATE_FILE = process.env.CAR_HEATER_STATE_FILE || 'car_heater_state.json'
const PUBLIC_DIR = process.env.CAR_HEATER_PUBLIC_DIR || './public'


const heater = new CarHeaterService(STATE_FILE, enableHeater, disableHeater)

export default function setupCarHeaterAPI() {
  const app = express()
  const httpServer = http.createServer(app)
  const ioServer = io(httpServer)

  setupRoutes(app)
  setupSocketIO(ioServer)

  heater.start()
    .then(() =>
      httpServer.listen(PORT, () => console.log(`CarHeaterAPI listening on port ${PORT}`))
    )
}

function setupRoutes(app: Express) {
  console.log('Using public dir:', PUBLIC_DIR)
  app.use(express.static(PUBLIC_DIR))
  app.use(express.json())
  app.get('/heater', getHeaterState)
  app.post('/heater', updateHeaterState)
}

function setupSocketIO(ioServer: Server) {
  const heaterStateP = houmSiteStream()
    .map((site: any) => find(site.devices, d => d.id === Lights.Outside.Frontyard.Car))
    .filter(identity)
    .map(heater => heater.state.on)
    .toProperty()

  heaterStateP
    .onValue(heaterStateEmitter(ioServer))

  ioServer.on('connection', (socket: Socket) => {
    heaterStateP.take(1)
      .onValue(heaterStateEmitter(socket))
  })
}

function heaterStateEmitter(emitter: Socket | Server) {
  return (heaterState: boolean) => emitter.emit('heaterState', heaterState)
}

function getHeaterState(req: Request, res: Response) {
  res.send(heater.getState())
}

function updateHeaterState(req: Request, res: Response) {
  if (CarHeaterState.validateSerializedStateObject(req.body)) {
    heater.update(req.body.readyTime, req.body.timerEnabled)
    res.send(heater.getState())
  } else {
    res.status(400).send({ error: `Invalid heater state: ${JSON.stringify(req.body)}` })
  }
}

function enableHeater() {
  console.log(`POSTing Houm to enable heater!`)
  turnOn(Lights.Outside.Frontyard.Car, 255)
}

function disableHeater() {
  console.log(`POSTing Houm to disable heater!`)
  turnOff(Lights.Outside.Frontyard.Car)
}

