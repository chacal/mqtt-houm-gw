import { getAllCityForecastItemsWithInterval, HourlyForecast } from './CityForecasts'
import { noop } from 'lodash'
import TimerState from './TimerState'
import { CronJob, CronTime } from 'cron'
import calculateHeatingMinutes from './HeatingDurationCalculator'
import { isHeating, nextHeatingStartInstant, nextReadyInstant } from './HeatingInstantCalculations'

export default class CarHeaterService {
  state: TimerState
  forecasts: HourlyForecast[] = []
  startCron: CronJob
  endCron: CronJob
  heatingDuration: number

  constructor(readonly stateFile: string, readonly heaterStartAction: () => void, readonly heaterStopAction: () => void) {
    this.startCron = new CronJob('', this.enableHeater.bind(this), noop, false, 'UTC')
    this.endCron = new CronJob('', heaterStopAction, noop, false, 'UTC')
  }

  start() {
    this.state = TimerState.load(this.stateFile)
    return this.startLoadingForecasts()
  }

  update(readyTime: string, timerEnabled: boolean) {
    this.state = new TimerState(readyTime, timerEnabled)
    TimerState.save(this.stateFile, this.state)

    this.heatingDuration = calculateHeatingMinutes(readyTime, this.forecasts)
    const startInstant = nextHeatingStartInstant(readyTime, this.heatingDuration)
    const readyInstant = nextReadyInstant(readyTime)

    this.startCron.setTime(new CronTime(toDailyCronStr(startInstant), 'UTC'))
    this.endCron.setTime(new CronTime(toDailyCronStr(readyInstant), 'UTC'))

    if (timerEnabled) {
      this.startCron.start()
      this.endCron.start()
    }

    if (timerEnabled && isHeating(readyTime, this.heatingDuration)) {
      this.enableHeater()
    }

    console.log(`New state: ${JSON.stringify(this.state)}, heating duration: ${this.heatingDuration}, start time: ${startInstant.toISOString()}`)
  }

  getState() {
    return { ...this.state, heatingDuration: this.heatingDuration }
  }

  private enableHeater() {
    if (this.heatingDuration !== 0) {
      this.heaterStartAction()
    } else {
      console.log('Heating duration is 0. Not starting heater.')
    }
  }

  private startLoadingForecasts(): Promise<void> {
    const forecasts = getAllCityForecastItemsWithInterval('espoo', 30 * 60 * 1000)
    forecasts.onValue(forecasts => {
      this.forecasts = forecasts
      this.update(this.state.readyTime, this.state.timerEnabled)
    })
    return forecasts.map(noop).firstToPromise()
  }
}

function toDailyCronStr(time: Date) {
  return `0 ${time.getUTCMinutes()} ${time.getUTCHours()} * * *`
}