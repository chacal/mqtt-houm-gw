import React, { ChangeEvent } from 'react'
import { FormControlLabel, makeStyles, TextField } from '@material-ui/core'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { addDays, isPast, format, parse } from 'date-fns'

interface TimeFieldProps {
  time?: Date
  onChange: (date: Date) => void
}

export function TimeField(props: TimeFieldProps) {

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const hhMMStr = e.target.value
    let localInstant = parse(hhMMStr, 'HH:mm', new Date())
    if (isPast(localInstant)) {
      localInstant = addDays(localInstant, 1)
    }
    const utcInstant = zonedTimeToUtc(localInstant, 'Europe/Helsinki')
    props.onChange(utcInstant)
  }

  return <TextField
    type="time"
    InputLabelProps={{ shrink: true, }}
    inputProps={{ step: 300, /* 5 min*/ }}
    onChange={handleChange}
    value={timeStrFromDate(props.time)}
    style={{ width: '80px' }}
  />
}

export function timeStrFromDate(date?: Date) {
  return date !== undefined ? format(toHelsinkiTime(date), 'HH:mm') : ''
}

function toHelsinkiTime(date: Date) {
  return utcToZonedTime(date, 'Europe/Helsinki')
}


const labelStyles = makeStyles(theme => ({
  leftAlignedLabel: {
    alignItems: 'start',
  },
  label: {
    fontSize: '14px',
    color: '#6b6b6b',
    marginBottom: '5px'
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
