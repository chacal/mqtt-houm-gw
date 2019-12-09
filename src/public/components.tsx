import React, { ChangeEvent } from 'react'
import {
  convert,
  DateTimeFormatter,
  LocalDate,
  LocalDateTime,
  LocalTime,
  nativeJs,
  ZonedDateTime,
  ZoneId
} from 'js-joda'
import { FormControlLabel, makeStyles, TextField } from '@material-ui/core'

interface TimeFieldProps {
  time?: Date
  onChange: (date: Date) => void
}

export function TimeField(props: TimeFieldProps) {

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const hhMMStr = e.target.value
    let localInstant = LocalDate.now().atTime(LocalTime.parse(hhMMStr))
    if (localInstant.isBefore(LocalDateTime.now())) {
      localInstant = localInstant.plusDays(1)
    }
    const helsinkiZoned = localInstant.atZone(ZoneId.of('Europe/Helsinki'))
    const utcInstant = helsinkiZoned.withZoneSameInstant(ZoneId.UTC)
    props.onChange(convert(utcInstant).toDate())
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
  return date !== undefined ?
    toHelsinkiTime(ZonedDateTime.from(nativeJs(date))).format(DateTimeFormatter.ofPattern('HH:mm')) :
    ''
}

function toHelsinkiTime(zdt: ZonedDateTime) {
  return zdt.withZoneSameInstant(ZoneId.of('Europe/Helsinki'))
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
