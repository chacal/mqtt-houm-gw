import React, { ChangeEvent } from 'react'
import { Container, Grid, makeStyles, Switch, Typography } from '@material-ui/core'
import { useEffect, useState } from 'react'
import { Duration, nativeJs, ZonedDateTime } from 'js-joda'
import { LabeledControl, TimeField, timeStrFromDate } from './components'

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

  function readyTimeChanged(readyTime: Date) {
    const newState = { ...heaterState, readyTime }
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
            control={<TimeField time={heaterState.readyTime} onChange={readyTimeChanged}/>}
            label="Ready time"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Switch checked={heaterState.timerEnabled} onChange={timerEnabledChanged}/>}
            label="Timer enabled"
            center
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>{formatHeatingTime(heaterState.heatingStart, heaterState.readyTime)}</Typography>}
            label="Heating time"
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
            label="Heating start time"
          />
        </Grid>
      </Grid>
    </Container>
  )
}

function formatHeatingStart(heatingStart?: Date) {
  if (heatingStart !== undefined) {
    const prefix = new Date().getDay() === heatingStart.getDay() ? 'Today ' : 'Tomorrow '
    return prefix + timeStrFromDate(heatingStart)
  } else {
    return ''
  }
}

function formatHeatingTime(heatingStart?: Date, readyTime?: Date) {
  if (readyTime !== undefined && heatingStart !== undefined) {
    const start = ZonedDateTime.from(nativeJs(heatingStart))
    const end = ZonedDateTime.from(nativeJs(readyTime))
    return Duration.between(start, end).toMinutes() + ' minutes'
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
    body: JSON.stringify(stateToSave),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => handleStateResponse(res, setHeaterState))
}

function handleStateResponse(res: Response, setHeaterState: (s: HeaterState) => void) {
  res.json()
    .then(heaterStateFromJSON)
    .then(setHeaterState)
}

function heaterStateFromJSON(jsonState: any): HeaterState {
  return {
    readyTime: new Date(jsonState.readyTime),
    heatingStart: new Date(jsonState.heatingStart),
    timerEnabled: jsonState.timerEnabled
  }
}