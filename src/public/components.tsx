import React, { Fragment } from 'react'
import { CircularProgress, Divider, FormControlLabel, Grid, makeStyles, Typography } from '@material-ui/core'

const componentStyles = makeStyles(theme => ({
  leftAlignedLabel: {
    alignItems: 'start',
  },
  label: {
    fontSize: '13px',
    color: '#838383',
    marginBottom: '1px'
  },
  subHeaderText: {
    marginTop: theme.spacing(4)
  },
  subHeaderDivider: {
    marginBottom: theme.spacing(2)
  }
}))

interface LabeledControlProps {
  control: React.ReactElement,
  label: React.ReactNode,
  center?: boolean
}

export function LabeledControl(props: LabeledControlProps) {
  const classes = componentStyles()

  return <FormControlLabel
    control={props.control}
    label={props.label}
    labelPlacement="top"
    className={props.center ? '' : classes.leftAlignedLabel}
    classes={{ label: classes.label }}
  />
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


interface SubHeaderProps {
  headerText: string
}

export function SubHeader(props: SubHeaderProps) {
  const classes = componentStyles()

  return (
    <Fragment>
      <Typography className={classes.subHeaderText} variant="body1">{props.headerText}</Typography>
      <Divider className={classes.subHeaderDivider}/>
    </Fragment>
  )
}

