import { getAllCityForecastItemsWithInterval, HourlyForecast } from './CityForecasts'
import { noop } from 'lodash'
import CarHeaterState from './CarHeaterState'
import { Duration, LocalTime } from 'js-joda'
import { CronJob, CronTime } from 'cron'
import calculateHeatingDuration from './HeatingDurationCalculator'
import { isHeating } from './HeatingInstantCalculations'

export default class CarHeaterService {
  state: CarHeaterState
  forecasts: HourlyForecast[] = []
  startCron: CronJob
  endCron: CronJob
  heatingDuration: Duration

  constructor(readonly stateFile: string, readonly heaterStartAction: () => void, readonly heaterStopAction: () => void) {
    this.startCron = new CronJob('', this.enableHeater.bind(this), noop, false, 'UTC')
    this.endCron = new CronJob('', heaterStopAction, noop, false, 'UTC')
  }

  start() {
    this.state = CarHeaterState.load(this.stateFile)
    return this.startLoadingForecasts()
  }

  update(readyTime: LocalTime, timerEnabled: boolean) {
    this.state = new CarHeaterState(readyTime, timerEnabled)
    CarHeaterState.save(this.stateFile, this.state)

    this.heatingDuration = calculateHeatingDuration(readyTime, this.forecasts)

    const startTime = readyTime.minus(this.heatingDuration)
    this.startCron.setTime(new CronTime(toDailyCronStr(startTime), 'UTC'))
    this.endCron.setTime(new CronTime(toDailyCronStr(readyTime), 'UTC'))

    if (timerEnabled) {
      this.startCron.start()
      this.endCron.start()
    }

    if (timerEnabled && this.endCron.nextDate().isBefore(this.startCron.nextDate())) {
      this.enableHeater()
    } else {
      this.heaterStopAction()
    }

    console.log(`New state: ${JSON.stringify(this.state)}, heating duration: ${this.heatingDuration}, start time: ${startTime.toString()}`)
  }

  getState() {
    return { ...this.state, heatingDuration: this.heatingDuration.toMinutes() }
  }

  private enableHeater() {
    if (!this.heatingDuration.isZero()) {
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

function toDailyCronStr(time: LocalTime) {
  return `0 ${time.minute()} ${time.hour()} * * *`
}