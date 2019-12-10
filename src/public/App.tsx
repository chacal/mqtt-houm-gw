import React, { ChangeEvent, useEffect, useState } from 'react'
import { CircularProgress, Container, Grid, makeStyles, Paper, Switch, Typography } from '@material-ui/core'
import { LabeledControl } from './components'
import { formatDistance, formatDistanceStrict, addDays, isFuture, set, startOfMinute } from 'date-fns'
import enGB from 'date-fns/locale/en-GB'
import { TimePicker } from '@material-ui/pickers'
import { zonedTimeToUtc } from 'date-fns-tz'

const appStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(2)
  },
  h5: {
    marginBottom: theme.spacing(2)
  }
}))

interface HeaterState {
  timerEnabled: boolean
  readyTime: Date,
  heatingStart: Date
}

export default function App() {
  const classes = appStyles()
  const [appState, setAppState] = useState<HeaterState>()
  useEffect(() => {
    loadHeaterState()
      .then(heater => setAppState(heater))
  }, [])

  return (
    <Container maxWidth='xs' className={classes.root}>
      <Typography variant="h5" className={classes.h5}>Car heater timer</Typography>
      {!appState ? <LoadingIndicator/> : <HeaterPanel {...appState}/>}
    </Container>
  )
}

function LoadingIndicator() {
  return (
    <Grid container justify='center' alignItems='center' style={{ height: '170px' }}>
      <Grid item xs={4}>
        <CircularProgress/>
      </Grid>
    </Grid>
  )
}

function HeaterPanel(props: HeaterState) {
  const [heaterState, setHeaterState] = useState(props)

  function readyTimeChanged(selectedTime: Date) {
    const nowInHelsinki = zonedTimeToUtc(new Date(), 'Europe/Helsinki')
    const selectedTimeToday = set(nowInHelsinki, { hours: selectedTime.getHours(), minutes: selectedTime.getMinutes() })
    const localInstant = isFuture(selectedTimeToday) ? selectedTimeToday : addDays(selectedTimeToday, 1)
    const utcInstant = startOfMinute(zonedTimeToUtc(localInstant, 'Europe/Helsinki'))

    updateAndSaveState({ ...heaterState, readyTime: utcInstant })
  }

  function timerEnabledChanged(e: ChangeEvent<HTMLInputElement>) {
    updateAndSaveState({ ...heaterState, timerEnabled: e.target.checked })
  }

  function updateAndSaveState(state: HeaterState) {
    setHeaterState(state)
    saveHeaterState(state)
      .then(setHeaterState)
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <LabeledControl
          control={<TimePicker value={heaterState.readyTime} onChange={readyTimeChanged}
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
                <Switch checked={heaterState.timerEnabled} onChange={timerEnabledChanged}/>
              </Grid>
              <Grid item>On</Grid>
            </Grid>
          }
          label="Timer state"
        />
      </Grid>
      <Grid item xs={6}>
        <LabeledControl
          control={<Typography>{formatHeatingTime(heaterState.heatingStart, heaterState.readyTime)}</Typography>}
          label="Heating"
        />
      </Grid>
      <Grid item xs={6}>
        <HeaterState {...heaterState}/>
      </Grid>
    </Grid>
  )
}

function HeaterState(heaterState: HeaterState) {
  const [, setState] = useState<any>()

  // Force re-render every second to update the remaining time
  useEffect(() => {
    const id = setInterval(() => setState({}), 1000)
    return () => clearInterval(id)
  }, [])

  return (<LabeledControl
    control={<Typography>{formatHeatingState(heaterState)}</Typography>}
    label={formatStateLabel(heaterState)}
  />)
}

function formatHeatingState(state: HeaterState) {
  const str = isFuture(state.heatingStart) ?
    formatDistance(state.heatingStart, new Date(), { locale: enGB, includeSeconds: true }) :
    formatDistanceStrict(state.readyTime, new Date(), { unit: 'minute' })
  return 'in ' + str
}

function formatStateLabel(state: HeaterState) {
  return isFuture(state.heatingStart) ? 'Starting' : 'Ending'
}

function formatHeatingTime(heatingStart: Date, readyTime: Date) {
  return formatDistanceStrict(readyTime, heatingStart, { unit: 'minute' })
}

function loadHeaterState() {
  return fetch(`/heater`)
    .then(res => handleStateResponse(res))
}

function saveHeaterState(stateToSave: HeaterState) {
  return fetch('/heater', {
    method: 'POST',
    body: JSON.stringify(heaterStateToJSON(stateToSave)),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => handleStateResponse(res))
}

function handleStateResponse(res: Response) {
  return res.json()
    .then(heaterStateFromJSON)
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