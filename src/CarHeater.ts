import { convert, nativeJs, ZonedDateTime } from 'js-joda'
import CarHeaterState from './CarHeaterState'
import HeatingDurationCalculator from './HeatingDurationCalculator'
import { Machine, interpret, Interpreter, assign } from 'xstate'
import { addDays, differenceInMilliseconds, formatDistanceToNow, isFuture, isPast, set, startOfMinute } from 'date-fns'

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

export default class CarHeater {
  private state: CarHeaterState
  private fsmService: Interpreter<CarHeaterState, HeaterSchema, any>

  private durationCalculator = new HeatingDurationCalculator(() => {
    this.state = CarHeaterState.load(this.stateFile)
    this.update(this.state.readyTime, this.state.timerEnabled)
  })

  constructor(private readonly stateFile: string, private readonly heaterStartAction: () => void) {
  }

  update(readyTime: Date, timerEnabled: boolean) {
    if (this.fsmService !== undefined) {
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
    if (heatingDuration.isZero()) {
      console.log('No heating required')
      return
    }

    const heatingStart = ZonedDateTime.from(nativeJs(readyTime)).minusTemporalAmount(heatingDuration)

    this.changeToState(new CarHeaterState(readyTime, convert(heatingStart).toDate(), timerEnabled))
    this.fsmService = interpret(createFSM(this.state)).onTransition(s => console.log('State:', s.value))
    this.fsmService.start()
  }

  private changeToState(state: CarHeaterState) {
    this.state = state
    CarHeaterState.save(this.stateFile, this.state)
    console.log(`Using heater state: ${JSON.stringify(this.state)}`)
  }

  getState() {
    return this.state
  }
}

function createFSM(state: CarHeaterState) {
  return Machine(
    {
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
              after: { HEATING_DELAY: 'waiting' },
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