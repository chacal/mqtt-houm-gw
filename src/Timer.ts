import { Duration, ZonedDateTime } from 'js-joda'

export default class Timer {
  private timer: NodeJS.Timer
  private triggerTime = ZonedDateTime.now()

  constructor(private readonly action: () => void) {
  }

  set(triggerTime: ZonedDateTime) {
    this.triggerTime = triggerTime
    clearTimeout(this.timer)
    this.timer = setTimeout(this.action, this.remaining().toMillis())
    console.log(`Timer set. Remaining: ${this.remaining()}`)
  }

  cancel() {
    clearTimeout(this.timer)
    this.triggerTime = ZonedDateTime.now()
  }

  remaining() {
    return this.triggerTime.isAfter(ZonedDateTime.now()) ?
      Duration.between(ZonedDateTime.now(), this.triggerTime) :
      Duration.ofSeconds(0)
  }
}