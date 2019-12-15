import React, { ChangeEvent, useEffect, useState } from 'react'
import {
  isHeating,
  nextHeatingStartInstant,
  nextReadyInstant,
  timeToday,
  toUtcHHmm
} from '../HeatingInstantCalculations'
import { Grid, Switch, Typography } from '@material-ui/core'
import { LabeledControl } from './components'
import { TimePicker } from '@material-ui/pickers'
import { TimerState } from './App'
import { formatDistance, formatDistanceStrict, subMinutes } from 'date-fns'
import enGB from 'date-fns/locale/en-GB'

interface TimerPanelProps {
  state: TimerState,
  onTimerStateChange: (newState: TimerState) => Promise<TimerState>
}

export default function TimerPanel(props: TimerPanelProps) {
  const [timerState, setTimerState] = useState(props.state)

  function readyTimeChanged(selectedTime: Date) {
    updateAndSaveState({ ...timerState, readyTime: toUtcHHmm(selectedTime) })
  }

  function timerEnabledChanged(e: ChangeEvent<HTMLInputElement>) {
    updateAndSaveState({ ...timerState, timerEnabled: e.target.checked })
  }

  function updateAndSaveState(state: TimerState) {
    setTimerState(state)
    props.onTimerStateChange(state)
      .then(setTimerState)
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <LabeledControl
          control={<TimePicker value={timeToday(timerState.readyTime)} onChange={readyTimeChanged}
                               ampm={false} minutesStep={5} style={{ width: '80px' }}/>}
          label="Ready"
        />
      </Grid>
      <Grid item xs={6}>
        <LabeledControl
          control={
            <Grid component="label" container alignItems="center" spacing={0}>
              <Grid item>Off</Grid>
              <Grid item>
                <Switch checked={timerState.timerEnabled} onChange={timerEnabledChanged}/>
              </Grid>
              <Grid item>On</Grid>
            </Grid>
          }
          label="Timer state"
        />
      </Grid>
      <Grid item xs={6}>
        <TimerState {...timerState}/>
      </Grid>
      <Grid item xs={6}>
        <LabeledControl
          control={<Typography>{formatHeatingTime(timerState.heatingDuration)}</Typography>}
          label="Heating"
        />
      </Grid>
    </Grid>
  )
}

function TimerState(timerState: TimerState) {
  const [, setState] = useState<any>()

  // Force re-render every second to update the remaining time
  useEffect(() => {
    const id = setInterval(() => setState({}), 1000)
    return () => clearInterval(id)
  }, [])

  return (<LabeledControl
    control={<Typography>{formatTimeUntilNextAction(timerState)}</Typography>}
    label={formatTimerState(timerState)}
  />)
}

export function formatTimeUntilNextAction(state: TimerState, now: Date = new Date()) {
  if (isHeating(state.readyTime, state.heatingDuration, now)) {
    return 'in ' + formatDistanceStrict(nextReadyInstant(state.readyTime, now), now, { unit: 'minute' })
  } else {
    return 'in ' + formatDistance(nextHeatingStartInstant(state.readyTime, state.heatingDuration, now), now, {
      locale: enGB,
      includeSeconds: true
    })
  }
}

export function formatTimerState(state: TimerState, now: Date = new Date()) {
  return isHeating(state.readyTime, state.heatingDuration, now) ? 'Ending' : 'Starting'
}

function formatHeatingTime(heatingDuration: number) {
  const now = new Date()
  return formatDistanceStrict(subMinutes(now, heatingDuration), now, { unit: 'minute' })
}
