import { convert, nativeJs, ZonedDateTime } from 'js-joda'
import CarHeaterState from './CarHeaterState'
import HeatingDurationCalculator from './HeatingDurationCalculator'
import { interpret, Interpreter } from 'xstate'
import { addDays, isPast, set, startOfMinute } from 'date-fns'
import { createHeaterFSM, HeaterEvents, HeaterSchema } from './CarHeaterFSM'


export default class CarHeater {
  private fsmService: Interpreter<CarHeaterState, HeaterSchema, HeaterEvents>
  private durationCalculator = new HeatingDurationCalculator(() => {
    const state = CarHeaterState.load(this.stateFile)
    this.update(state.readyTime, state.timerEnabled)
  })

  constructor(private readonly stateFile: string,
              private readonly heaterStartAction: () => void,
              private readonly heaterStopAction: () => void) {
  }

  update(readyTime: Date, timerEnabled: boolean) {
    if (this.fsmService !== undefined) {
      this.fsmService.send('DISABLE')
      this.fsmService.stop()
    }

    // If ready time has already passed, use its HH:mm for tomorrow as a new ready time
    if (isPast(readyTime)) {
      console.log(`Ready time ${readyTime.toISOString()} is already gone, setting for tomorrow.`)
      readyTime = sameHHmmTomorrow(readyTime)
      console.log('New ready time:', readyTime.toISOString())
    }

    const heatingDuration = this.durationCalculator.calculateDuration(readyTime)
    console.log('Heating duration:', heatingDuration.toString())

    const heatingStart = ZonedDateTime.from(nativeJs(readyTime)).minusTemporalAmount(heatingDuration)
    const state = new CarHeaterState(readyTime, convert(heatingStart).toDate(), timerEnabled)

    this.fsmService = interpret(createHeaterFSM(state, this.heaterStartAction, this.heaterStopAction))
    this.fsmService.onChange(s => this.saveState(s))
    this.fsmService.onTransition(s => console.log('State:', s.value))
    this.fsmService.start()
  }

  private saveState(state: CarHeaterState) {
    CarHeaterState.save(this.stateFile, state)
    console.log(`Using heater state: ${JSON.stringify(state)}`)
  }

  getState() {
    return this.fsmService.state.context
  }
}

export function sameHHmmTomorrow(d: Date) {
  return startOfMinute(set(addDays(new Date(), 1), {
    hours: d.getHours(),
    minutes: d.getMinutes()
  }))
}