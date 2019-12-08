import { convert, Duration, nativeJs, ZonedDateTime } from 'js-joda'
import CarHeaterState from './CarHeaterState'
import Timer from './Timer'

export default class CarHeater {
  private state: CarHeaterState
  private heaterTimer = new Timer(() => {
    this.heaterStartAction()
    this.cancel()
  })

  constructor(private readonly stateFile: string, private readonly heaterStartAction: () => void) {
    this.state = CarHeaterState.load(stateFile)
    this.update(this.state.readyTime, this.state.timerEnabled)
  }

  update(readyTime, timerEnabled) {
    const heatingDuration = calculateHeatingDuration(readyTime)
    const heatingStart = ZonedDateTime.from(nativeJs(readyTime)).minusTemporalAmount(heatingDuration)

    if (heatingStart.isBefore(ZonedDateTime.now())) {
      console.log(`Can't set start time in history!`)
      this.cancel()
    } else {
      this.changeToState(new CarHeaterState(readyTime, convert(heatingStart).toDate(), timerEnabled))
      if (timerEnabled) {
        this.heaterTimer.set(heatingStart)
      } else {
        this.cancel()
      }
    }
  }

  private cancel() {
    this.heaterTimer.cancel()
    this.changeToState(new CarHeaterState(this.state.readyTime, this.state.heatingStart, false))
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

function calculateHeatingDuration(readyTime: Date): Duration {
  return Duration.ofMinutes(10)
}

