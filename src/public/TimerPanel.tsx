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
          label="Ready time"
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
          label="State"
        />
      </Grid>
      <Grid item>
        <TimerState {...timerState}/>
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
    control={<Typography variant={'body2'}>{formatState(timerState)}</Typography>}
    label={'Status'}
  />)
}


export function formatState(state: TimerState, now: Date = new Date()) {
  if (state.timerEnabled) {
    const duration = formatHeatingTime(state.heatingDuration)

    if (isHeating(state.readyTime, state.heatingDuration, now)) {
      return `Heating, ${formatHeatingLeft(state, now)} left. Total ${duration}.`
    } else {
      return `Waiting, ${formatWaitLeft(state, now)} left. Will heat for ${duration}.`
    }

  } else {
    return 'Disabled'
  }
}

function formatHeatingLeft(state: TimerState, now: Date) {
  return formatDistanceStrict(nextReadyInstant(state.readyTime, now), now, { unit: 'minute' })
}

function formatWaitLeft(state: TimerState, now: Date) {
  return formatDistance(nextHeatingStartInstant(state.readyTime, state.heatingDuration, now), now, {
    locale: enGB,
    includeSeconds: true
  })
}

function formatHeatingTime(heatingDuration: number) {
  const now = new Date()
  return formatDistanceStrict(subMinutes(now, heatingDuration), now, { unit: 'minute' })
}
