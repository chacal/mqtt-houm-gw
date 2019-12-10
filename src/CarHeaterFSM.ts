import CarHeaterState from './CarHeaterState'
import { assign, Machine } from 'xstate'
import { differenceInMilliseconds, formatDistanceToNow, isBefore, isFuture, isPast } from 'date-fns'
import { sameHHmmTomorrow } from './CarHeater'

export interface HeaterSchema {
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

export type HeaterEvents = { type: 'DISABLE' }

export function createHeaterFSM(state: CarHeaterState, enableHeater: () => void, disableHeater: () => void) {
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
