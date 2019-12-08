import { readFileSync, writeFileSync } from 'fs'

export default class CarHeaterState {
  constructor(readonly readyTime: Date = new Date(),
              readonly heatingStart: Date = new Date(),
              readonly timerEnabled: boolean = false) {
  }

  static load(stateFile: string): CarHeaterState {
    let ret = new CarHeaterState()

    try {
      const obj = JSON.parse(readFileSync(stateFile, 'utf8'))
      if (CarHeaterState.validateSavedStateObject(obj)) {
        ret = new CarHeaterState(new Date(obj.readyTime), new Date(obj.heatingStart), obj.timerEnabled)
      }
    } catch (e) {
      console.log(`Unable to load state from ${stateFile}`, e)
    }

    return ret
  }

  static save(stateFile: string, state: CarHeaterState) {
    writeFileSync(stateFile, JSON.stringify(state))
  }

  private static validateSavedStateObject(obj: any) {
    return isDateStr(obj.readyTime) && isDateStr(obj.heatingStart) &&
      obj.timerEnabled !== undefined && typeof obj.timerEnabled == 'boolean'

    function isDateStr(val: any) {
      return val !== undefined && typeof val === 'string' && !isNaN(Date.parse(val))
    }
  }
}