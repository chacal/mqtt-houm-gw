import { expect } from 'chai'
import { formatState } from '../src/public/TimerPanel'
import { isHeating } from '../src/HeatingInstantCalculations'

describe('waiting/heating time', () => {
  it('formats correctly 1', () => {
    expect(heatingTimeFormatting('12:30', '14:00', 30))
      .to.equal('Waiting, about 1 hour left. Will heat for 30 minutes.')
  })
  it('formats correctly 2', () => {
    expect(heatingTimeFormatting('00:15', '00:30', 45))
      .to.equal('Heating, 15 minutes left. Total 45 minutes.')
  })
  it('formats correctly 3', () => {
    expect(heatingTimeFormatting('14:00', '12:00', 30))
      .to.equal('Waiting, about 22 hours left. Will heat for 30 minutes.')
  })
  it('formats correctly 4', () => {
    expect(heatingTimeFormatting('14:00', '12:00', 0))
      .to.equal('Waiting, about 22 hours left. Will heat for 0 minutes.')
  })
  it('formats correctly 5', () => {
    expect(heatingTimeFormatting('12:00', '12:00', 30))
      .to.equal('Waiting, about 24 hours left. Will heat for 30 minutes.')
  })
  it('formats correctly 6', () => {
    expect(heatingTimeFormatting('13:00', '13:30', 45))
      .to.equal('Heating, 30 minutes left. Total 45 minutes.')
  })
  it('formats correctly 6', () => {
    expect(heatingTimeFormatting('13:00', '16:00', 60))
      .to.equal('Waiting, about 2 hours left. Will heat for 60 minutes.')
  })
})

describe('waiting/heating state', () => {
  it('formats correctly 1', () => {
    expect(heatingState('12:30', '14:00', 30)).to.equal(false)
  })
  it('formats correctly 2', () => {
    expect(heatingState('00:15', '00:30', 45)).to.equal(true)
  })
  it('formats correctly 3', () => {
    expect(heatingState('14:00', '12:00', 30)).to.equal(false)
  })
  it('formats correctly 4', () => {
    expect(heatingState('14:00', '12:00', 0)).to.equal(false)
  })
  it('formats correctly 5', () => {
    expect(heatingState('12:00', '12:00', 30)).to.equal(false)
  })
  it('formats correctly 6', () => {
    expect(heatingState('13:00', '13:30', 45)).to.equal(true)
  })
  it('formats correctly 6', () => {
    expect(heatingState('13:00', '16:00', 60)).to.equal(false)
  })
})

function heatingTimeFormatting(currentTime: string, readyTime: string, heatingDuration: number) {
  const state = { timerEnabled: true, readyTime: readyTime, heatingDuration: heatingDuration }
  const now = new Date(`2019-12-12T${currentTime}:13.120Z`)
  return formatState(state, now)
}

function heatingState(currentTime: string, readyTime: string, heatingDuration: number) {
  const now = new Date(`2019-12-12T${currentTime}:13.120Z`)
  return isHeating(readyTime, heatingDuration, now)
}