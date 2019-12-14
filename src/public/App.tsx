import React, { useEffect, useState } from 'react'
import { CircularProgress, Container, Grid, makeStyles, Typography } from '@material-ui/core'
import HeaterPanel from './HeaterPanel'

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

  useEffect(() => {
    loadHeaterState()
      .then(setHeaterState)
  }, [])

  return (
    <Container maxWidth='xs' className={classes.root}>
      <Typography variant="h5" className={classes.h5}>Car heater timer</Typography>
      {!heaterSate ? <LoadingIndicator/> : <HeaterPanel state={heaterSate} onHeaterStateChange={saveHeaterState}/>}
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