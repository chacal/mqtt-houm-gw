import React, { useEffect, useState } from 'react'
import { Container, makeStyles, Typography } from '@material-ui/core'
import TimerPanel from './TimerPanel'
import io from 'socket.io-client'
import { LoadingIndicator, SubHeader } from './components'
import { HeaterPanel } from './HeaterPanel'

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

export enum HeaterState {
  On,
  Off,
  Unknown
}

export default function App() {
  const classes = appStyles()
  const [timerState, setTimerState] = useState<TimerState>()
  const [heaterSate, setHeaterState] = useState(HeaterState.Unknown)

  useEffect(() => {
    loadTimerState()
      .then(setTimerState)

    socket.on('heaterState', (state: boolean) =>
      setHeaterState(state ? HeaterState.On : HeaterState.Off)
    )
  }, [])

  function applyHeaterState(newState: HeaterState) {
    setHeaterState(newState)
    saveHeaterState(newState)
  }

  return (
    <Container maxWidth='xs' className={classes.root}>
      <Typography variant="h5" className={classes.h5}>Car heater</Typography>

      <SubHeader headerText={'Heater'}/>
      <HeaterPanel onHeaterStateChanged={applyHeaterState} heaterState={heaterSate}/>

      <SubHeader headerText={'Timer'}/>
      {!timerState ? <LoadingIndicator/> : <TimerPanel state={timerState} onTimerStateChange={saveTimerState}/>}
    </Container>
  )
}


function loadTimerState() {
  return fetch(`/timer`)
    .then(res => res.json())
}

function saveTimerState(stateToSave: TimerState) {
  return postJSON('/timer', timerStateToJSON(stateToSave))
    .then(res => res.json())
}

function saveHeaterState(state: HeaterState) {
  postJSON('/heater', { state: state === HeaterState.On })
}

function postJSON(url: string, data: any) {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}

function timerStateToJSON(state: TimerState) {
  return {
    readyTime: state.readyTime,
    timerEnabled: state.timerEnabled
  }
}