import express = require('express')
import { Express } from 'express'
import { Request, Response } from 'express-serve-static-core'
import CarHeater from './CarHeater'
import { turnOff, turnOn } from './houm'
import { Lights } from './Lights'

const PORT = 4000
const STATE_FILE = process.env.CAR_HEATER_STATE_FILE || 'car_heater_state.json'
const PUBLIC_DIR = process.env.CAR_HEATER_PUBLIC_DIR || './public'

interface StateUpdate {
  timerEnabled: boolean,
  readyTime: string
}

const heater = new CarHeater(STATE_FILE, enableHeater, disableHeater)

export default function setupCarHeaterAPI() {
  const app = express()
  setupRoutes(app)
  app.listen(PORT, () => console.log(`CarHeaterAPI listening on port ${PORT}`))
}

function setupRoutes(app: Express) {
  console.log('Using public dir:', PUBLIC_DIR)
  app.use(express.static(PUBLIC_DIR))
  app.use(express.json())
  app.get('/heater', getHeaterState)
  app.post('/heater', updateHeaterState)
}

function getHeaterState(req: Request, res: Response) {
  res.send(heater.getState())
}

function updateHeaterState(req: Request, res: Response) {
  if (validateStateUpdate(req.body)) {
    heater.update(new Date(req.body.readyTime), req.body.timerEnabled)
    res.send(heater.getState())
  } else {
    res.sendStatus(400).send({ error: `Invalid heater state: ${JSON.stringify(req.body)}` })
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

function validateStateUpdate(obj: any): obj is StateUpdate {
  return obj.readyTime !== undefined && typeof obj.readyTime === 'string' && !isNaN(Date.parse(obj.readyTime)) &&
    obj.timerEnabled !== undefined && typeof obj.timerEnabled == 'boolean'
}
