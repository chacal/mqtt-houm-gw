import React, { ChangeEvent, useEffect, useState } from 'react'
import { Container, Grid, makeStyles, Switch, Typography } from '@material-ui/core'
import { LabeledControl } from './components'
import { formatRelative, formatDistanceStrict, addDays, isFuture, set, startOfMinute } from 'date-fns'
import enGB from 'date-fns/locale/en-GB'
import { TimePicker } from '@material-ui/pickers'
import { zonedTimeToUtc } from 'date-fns-tz'

const appStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(3)
  }
}))

interface HeaterState {
  timerEnabled: boolean
  readyTime?: Date,
  heatingStart?: Date,
}

export default function App() {
  const classes = appStyles()
  const [heaterState, setHeaterState] = useState<HeaterState>({ timerEnabled: false })

  useEffect(() => {
    loadHeaterState(setHeaterState)
  }, [])

  function readyTimeChanged(selectedTime: Date) {
    const nowInHelsinki = zonedTimeToUtc(new Date(), 'Europe/Helsinki')
    const selectedTimeToday = set(nowInHelsinki, { hours: selectedTime.getHours(), minutes: selectedTime.getMinutes() })
    const localInstant = isFuture(selectedTimeToday) ? selectedTimeToday : addDays(selectedTimeToday, 1)
    const utcInstant = startOfMinute(zonedTimeToUtc(localInstant, 'Europe/Helsinki'))

    const newState = { ...heaterState, readyTime: utcInstant }
    setHeaterState(newState)
    saveHeaterState(newState, setHeaterState)
  }

  function timerEnabledChanged(e: ChangeEvent<HTMLInputElement>) {
    const newState = { ...heaterState, timerEnabled: e.target.checked }
    setHeaterState(newState)
    saveHeaterState(newState, setHeaterState)
  }

  return (
    <Container maxWidth='xs' className={classes.root}>
      <h1>Car heater</h1>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <LabeledControl
            control={<TimePicker value={heaterState.readyTime} onChange={readyTimeChanged}
                                 ampm={false} minutesStep={5} style={{ width: '80px' }}/>}
            label="Ready"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Switch checked={heaterState.timerEnabled} onChange={timerEnabledChanged}/>}
            label="Timer"
            center
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>{formatHeatingTime(heaterState.heatingStart, heaterState.readyTime)}</Typography>}
            label="Heating"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>-</Typography>}
            label="Heater state"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>{formatHeatingStart(heaterState.heatingStart)}</Typography>}
            label="Start"
          />
        </Grid>
      </Grid>
    </Container>
  )
}

function formatHeatingStart(heatingStart?: Date) {
  if (heatingStart !== undefined) {
    return formatRelative(heatingStart, new Date(), { locale: enGB })
  } else {
    return ''
  }
}

function formatHeatingTime(heatingStart?: Date, readyTime?: Date) {
  if (readyTime !== undefined && heatingStart !== undefined) {
    return formatDistanceStrict(readyTime, heatingStart, { unit: 'minute' })
  } else {
    return ''
  }
}

function loadHeaterState(setHeaterState: (s: HeaterState) => void) {
  fetch(`/heater`)
    .then(res => handleStateResponse(res, setHeaterState))
}

function saveHeaterState(stateToSave: HeaterState, setHeaterState: (s: HeaterState) => void) {
  fetch('/heater', {
    method: 'POST',
    body: JSON.stringify(heaterStateToJSON(stateToSave)),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => handleStateResponse(res, setHeaterState))
}

function handleStateResponse(res: Response, setHeaterState: (s: HeaterState) => void) {
  res.json()
    .then(heaterStateFromJSON)
    .then(setHeaterState)
}

function heaterStateToJSON(state: HeaterState) {
  return {
    readyTime: state.readyTime,
    timerEnabled: state.timerEnabled
  }
}

function heaterStateFromJSON(jsonState: any): HeaterState {
  return {
    readyTime: new Date(jsonState.readyTime),
    heatingStart: new Date(jsonState.heatingStart),
    timerEnabled: jsonState.timerEnabled
  }
}