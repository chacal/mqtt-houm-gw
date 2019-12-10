import { convert, nativeJs, ZonedDateTime } from 'js-joda'
import CarHeaterState from './CarHeaterState'
import HeatingDurationCalculator from './HeatingDurationCalculator'
import { Machine, interpret, Interpreter, assign } from 'xstate'
import {
  addDays,
  differenceInMilliseconds,
  formatDistanceToNow,
  isBefore,
  isFuture,
  isPast,
  set,
  startOfMinute
} from 'date-fns'

interface HeaterSchema {
  states: {
    enabled: {
      states: {
        waiting: {}
        heating: {}
      }
    },
    disabled: {}
  }
}

type HeaterEvents = { type: 'DISABLE' }

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
      console.log(`Ready time ${readyTime.toISOString()} is already gone, setting to tomorrow.`)
      readyTime = sameHHmmTomorrow(readyTime)
      console.log('New ready time:', readyTime.toISOString())
    }

    const heatingDuration = this.durationCalculator.calculateDuration(readyTime)
    console.log('Heating duration:', heatingDuration.toString())

    const heatingStart = ZonedDateTime.from(nativeJs(readyTime)).minusTemporalAmount(heatingDuration)
    const state = new CarHeaterState(readyTime, convert(heatingStart).toDate(), timerEnabled)

    this.fsmService = interpret(createFSM(state, this.heaterStartAction, this.heaterStopAction))
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

function createFSM(state: CarHeaterState, enableHeater: () => void, disableHeater: () => void) {
  return Machine<CarHeaterState, HeaterSchema, HeaterEvents>(
    {
      key: 'heater',
      context: state,
      initial: state.timerEnabled ? 'enabled' : 'disabled',
      states: {
        enabled: {
          initial: shouldHeat(state) ? 'heating' : 'waiting',
          states: {
            waiting: {
              entry: 'recalculateTimes',
              after: { WAITING_DELAY: 'heating' },
            },

            heating: {
              entry: 'enableHeater',
              exit: disableHeater,
              after: { HEATING_DELAY: 'waiting' },
              on: {
                'DISABLE': '#heater.disabled'
              }
            }
          }
        },

        disabled: {}
      },
    }, {
      delays: {
        WAITING_DELAY: (context: CarHeaterState) => {
          console.log('Waiting, delay:', formatDistanceToNow(context.heatingStart))
          return differenceInMilliseconds(context.heatingStart, new Date())
        },
        HEATING_DELAY: (context: CarHeaterState) => {
          console.log('Heating, delay:', formatDistanceToNow(context.readyTime))
          return differenceInMilliseconds(context.readyTime, new Date())
        }
      },
      actions: {
        recalculateTimes: assign((context: CarHeaterState) => {
          if (isPast(context.readyTime)) {
            console.log('Recalculating heating times')
            return {
              heatingStart: sameHHmmTomorrow(context.heatingStart),
              readyTime: sameHHmmTomorrow(context.readyTime)
            }
          } else {
            return context
          }
        }),
        enableHeater: (context: CarHeaterState) => {
          if (isBefore(context.heatingStart, context.readyTime)) {
            enableHeater()
          } else {
            console.log('Heating time is <= 0. Not enabling heater.')
          }
        }
      }
    }
  )

  function shouldHeat(state: CarHeaterState) {
    return isPast(state.heatingStart) && isFuture(state.readyTime)
  }
}

function sameHHmmTomorrow(d: Date) {
  return startOfMinute(set(addDays(new Date(), 1), {
    hours: d.getHours(),
    minutes: d.getMinutes()
  }))
}