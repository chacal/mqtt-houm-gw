import React, { useEffect, useState } from 'react'
import { Container, Grid, makeStyles, Typography } from '@material-ui/core'
import TimerPanel from './TimerPanel'
import io from 'socket.io-client'
import { LoadingIndicator, OnOffState } from './components'

const socket = io()

const appStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(2)
  },
  h5: {
    marginBottom: theme.spacing(2)
  }
}))

export interface TimerState {
  timerEnabled: boolean
  readyTime: string,
  heatingDuration: number
}

export default function App() {
  const classes = appStyles()
  const [timerState, setTimerState] = useState<TimerState>()
  const [heaterOnOffSate, setHeaterOnOffState] = useState<boolean | undefined>()

  useEffect(() => {
    loadTimerState()
      .then(setTimerState)

    socket.on('heaterState', (onOffState: boolean) => setHeaterOnOffState(onOffState))
  }, [])

  return (
    <Container maxWidth='xs' className={classes.root}>
      <Grid container>
        <Grid item xs={8}>
          <Typography variant="h5" className={classes.h5}>Car heater timer</Typography>
        </Grid>
        <Grid item xs={4}>
          <OnOffState onOffState={heaterOnOffSate}/>
        </Grid>
      </Grid>
      {!timerState ? <LoadingIndicator/> : <TimerPanel state={timerState} onTimerStateChange={saveTimerState}/>}
    </Container>
  )
}


function loadTimerState() {
  return fetch(`/heater`)
    .then(res => res.json())
}

function saveTimerState(stateToSave: TimerState) {
  return fetch('/heater', {
    method: 'POST',
    body: JSON.stringify(timerStateToJSON(stateToSave)),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => res.json())
}

function timerStateToJSON(state: TimerState) {
  return {
    readyTime: state.readyTime,
    timerEnabled: state.timerEnabled
  }
}