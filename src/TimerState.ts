import { readFileSync, writeFileSync } from 'fs'

export interface SearializedTimerState {
  timerEnabled: boolean,
  readyTime: string
}

export default class TimerState {
  constructor(readonly readyTime = '12:00',
              readonly timerEnabled = false) {
  }

  static load(stateFile: string): TimerState {
    let ret = new TimerState()

    try {
      const obj = JSON.parse(readFileSync(stateFile, 'utf8'))
      if (TimerState.validateSerializedStateObject(obj)) {
        ret = new TimerState(obj.readyTime, obj.timerEnabled)
      }
    } catch (e) {
      console.log(`Unable to load state from ${stateFile}, using defaults.`, e)
    }

    return ret
  }

  static save(stateFile: string, state: TimerState) {
    writeFileSync(stateFile, JSON.stringify(state))
  }

  static validateSerializedStateObject(obj: any): obj is SearializedTimerState {
    return isTimeStr(obj.readyTime) && obj.timerEnabled !== undefined && typeof obj.timerEnabled == 'boolean'

    function isTimeStr(val: any) {
      return val !== undefined && typeof val === 'string' && val.match(/[0-2]\d:[0-5]\d/) !== null
    }
  }
}

