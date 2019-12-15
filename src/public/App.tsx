import React, { useEffect, useState } from 'react'
import { Container, Grid, makeStyles, Typography } from '@material-ui/core'
import HeaterPanel from './HeaterPanel'
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

export interface HeaterState {
  timerEnabled: boolean
  readyTime: string,
  heatingDuration: number
}

export default function App() {
  const classes = appStyles()
  const [heaterSate, setHeaterState] = useState<HeaterState>()
  const [heaterOnOffSate, setHeaterOnOffState] = useState<boolean | undefined>()

  useEffect(() => {
    loadHeaterState()
      .then(setHeaterState)

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
      {!heaterSate ? <LoadingIndicator/> : <HeaterPanel state={heaterSate} onHeaterStateChange={saveHeaterState}/>}
    </Container>
  )
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
}

function heaterStateToJSON(state: HeaterState) {
  return {
    readyTime: state.readyTime,
    timerEnabled: state.timerEnabled
  }
}