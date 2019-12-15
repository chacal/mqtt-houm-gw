import React from 'react'
import { Chip, CircularProgress, FormControlLabel, Grid, makeStyles } from '@material-ui/core'

const labelStyles = makeStyles(theme => ({
  leftAlignedLabel: {
    alignItems: 'start',
  },
  label: {
    fontSize: '13px',
    color: '#838383',
    marginBottom: '1px'
  }
}))

interface LabeledControlProps {
  control: React.ReactElement,
  label: React.ReactNode,
  center?: boolean
}

export function LabeledControl(props: LabeledControlProps) {
  const classes = labelStyles()

  return <FormControlLabel
    control={props.control}
    label={props.label}
    labelPlacement="top"
    className={props.center ? '' : classes.leftAlignedLabel}
    classes={{ label: classes.label }}
  />
}


interface OnOffStateProps {
  onOffState: boolean | undefined
}

export function OnOffState(props: OnOffStateProps) {
  const str = props.onOffState === undefined ? '-' : (props.onOffState ? 'ON' : 'OFF')
  const color = str === 'ON' ? 'secondary' : 'default'
  return (
    <Chip label={str} color={color}/>
  )
}


export function LoadingIndicator() {
  return (
    <Grid container justify='center' alignItems='center' style={{ height: '170px' }}>
      <Grid item xs={4}>
        <CircularProgress/>
      </Grid>
    </Grid>
  )
}
