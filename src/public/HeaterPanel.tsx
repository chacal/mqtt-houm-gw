import { Grid, makeStyles, Switch, Typography } from '@material-ui/core'
import React, { ChangeEvent } from 'react'
import { HeaterState } from './App'

const styles = makeStyles(theme => ({
  root: {
    width: 64,
    height: 40,
    padding: 11,
    margin: theme.spacing(1),
  },
  switchBase: {
    padding: 5,
    '&$checked': {
      transform: 'translateX(26px)',
      color: theme.palette.common.white,
      '& + $track': {
        opacity: 1,
        border: 'none',
      },
    },
    '&$focusVisible $thumb': {
      border: '6px solid #fff',
    },
  },
  thumb: {
    width: 30,
    height: 30,
    border: '1px solid #ddd'
  },
  track: {
    borderRadius: 26 / 2,
  },
  checked: {},
  focusVisible: {},
}))

interface HeaterPanelProps {
  heaterState: HeaterState,
  onHeaterStateChanged: (s: HeaterState) => void
}

export function HeaterPanel(props: HeaterPanelProps) {
  const classes = styles()

  function onSwitchChange(e: ChangeEvent, s: boolean) {
    props.onHeaterStateChanged(s ? HeaterState.On : HeaterState.Off)
  }

  return (
    <Grid container justify={'center'} spacing={0}>
      <Grid item xs={5}>
        <Grid component="label" container alignItems="center" spacing={0}>
          <Grid item><Typography variant="body1">Off</Typography></Grid>
          <Grid item>
            <Switch
              classes={{
                root: classes.root,
                switchBase: classes.switchBase,
                thumb: classes.thumb,
                track: classes.track,
                checked: classes.checked,
              }}
              checked={boolStateFor(props.heaterState)}
              disabled={props.heaterState === HeaterState.Unknown}
              onChange={onSwitchChange}
            />
          </Grid>
          <Grid item><Typography variant="body1">On</Typography></Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

function boolStateFor(state: HeaterState) {
  return state === HeaterState.On
}