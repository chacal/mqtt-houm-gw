import { Grid, Switch } from '@material-ui/core'
import React, { ChangeEvent } from 'react'
import { HeaterState } from './App'

interface HeaterPanelProps {
  heaterState: HeaterState,
  onHeaterStateChanged: (s: HeaterState) => void
}

export function HeaterPanel(props: HeaterPanelProps) {
  function onSwitchChange(e: ChangeEvent, s: boolean) {
    props.onHeaterStateChanged(s ? HeaterState.On : HeaterState.Off)
  }

  return (
    <Grid container justify={'center'} spacing={0}>
      <Grid item xs={4}>
        <Grid component="label" container alignItems="center" spacing={0}>
          <Grid item>Off</Grid>
          <Grid item>
            <Switch
              checked={boolStateFor(props.heaterState)}
              disabled={props.heaterState === HeaterState.Unknown}
              onChange={onSwitchChange}
            />
          </Grid>
          <Grid item>On</Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

function boolStateFor(state: HeaterState) {
  return state === HeaterState.On
}