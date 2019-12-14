import { expect } from 'chai'
import { formatHeatingState, formatTimeUntilNextAction } from '../src/public/HeaterPanel'

describe('waiting/heating time', () => {
  it('formats correctly 1', () => {
    expect(heatingTimeFormatting('12:30', '14:00', 30)).to.equal('in about 1 hour')
  })
  it('formats correctly 2', () => {
    expect(heatingTimeFormatting('00:15', '00:30', 45)).to.equal('in 15 minutes')
  })
  it('formats correctly 3', () => {
    expect(heatingTimeFormatting('14:00', '12:00', 30)).to.equal('in about 22 hours')
  })
  it('formats correctly 4', () => {
    expect(heatingTimeFormatting('14:00', '12:00', 0)).to.equal('in about 22 hours')
  })
  it('formats correctly 5', () => {
    expect(heatingTimeFormatting('12:00', '12:00', 30)).to.equal('in about 24 hours')
  })
  it('formats correctly 6', () => {
    expect(heatingTimeFormatting('13:00', '13:30', 45)).to.equal('in 30 minutes')
  })
  it('formats correctly 6', () => {
    expect(heatingTimeFormatting('13:00', '16:00', 60)).to.equal('in about 2 hours')
  })
})

describe('waiting/heating state', () => {
  it('formats correctly 1', () => {
    expect(heatingStateFormatting('12:30', '14:00', 30)).to.equal('Starting')
  })
  it('formats correctly 2', () => {
    expect(heatingStateFormatting('00:15', '00:30', 45)).to.equal('Ending')
  })
  it('formats correctly 3', () => {
    expect(heatingStateFormatting('14:00', '12:00', 30)).to.equal('Starting')
  })
  it('formats correctly 4', () => {
    expect(heatingStateFormatting('14:00', '12:00', 0)).to.equal('Starting')
  })
  it('formats correctly 5', () => {
    expect(heatingStateFormatting('12:00', '12:00', 30)).to.equal('Starting')
  })
  it('formats correctly 6', () => {
    expect(heatingStateFormatting('13:00', '13:30', 45)).to.equal('Ending')
  })
  it('formats correctly 6', () => {
    expect(heatingStateFormatting('13:00', '16:00', 60)).to.equal('Starting')
  })
})

function heatingTimeFormatting(currentTime: string, readyTime: string, heatingDuration: number) {
  const state = { timerEnabled: true, readyTime: readyTime, heatingDuration: heatingDuration }
  const now = new Date(`2019-12-12T${currentTime}:13.120Z`)
  return formatTimeUntilNextAction(state, now)
}
function heatingStateFormatting(currentTime: string, readyTime: string, heatingDuration: number) {
  const state = { timerEnabled: true, readyTime: readyTime, heatingDuration: heatingDuration }
  const now = new Date(`2019-12-12T${currentTime}:13.120Z`)
  return formatHeatingState(state, now)
}