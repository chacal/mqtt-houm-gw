import { readFileSync, writeFileSync } from 'fs'
import { LocalTime } from 'js-joda'

export interface SearializedCarHeaterState2 {
  timerEnabled: boolean,
  readyTime: string
}

export default class CarHeaterState {
  constructor(readonly readyTime = LocalTime.parse('12:00'),
              readonly timerEnabled = false) {
  }

  static load(stateFile: string): CarHeaterState {
    let ret = new CarHeaterState()

    try {
      const obj = JSON.parse(readFileSync(stateFile, 'utf8'))
      if (CarHeaterState.validateSerializedStateObject(obj)) {
        ret = new CarHeaterState(LocalTime.parse(obj.readyTime), obj.timerEnabled)
      }
    } catch (e) {
      console.log(`Unable to load state from ${stateFile}, using defaults.`, e)
    }

    return ret
  }

  static save(stateFile: string, state: CarHeaterState) {
    writeFileSync(stateFile, JSON.stringify(state))
  }

  static validateSerializedStateObject(obj: any): obj is SearializedCarHeaterState2 {
    try {
      LocalTime.parse(obj.readyTime)
      return isTimeStr(obj.readyTime) && obj.timerEnabled !== undefined && typeof obj.timerEnabled == 'boolean'
    } catch (e) {
      return false
    }

    function isTimeStr(val: any) {
      return val !== undefined && typeof val === 'string' && val.match(/[0-2]\d:[0-5]\d/) !== null
    }
  }
}

