const { TextField, makeStyles } = MaterialUI
const { ZonedDateTime, DateTimeFormatter, ZoneId, LocalDate, LocalTime, LocalDateTime } = JSJoda

function TimeField(props) {

  function handleChange(e) {
    const hhMMStr = e.target.value
    let localInstant = LocalDate.now().atTime(LocalTime.parse(hhMMStr))
    if (localInstant.isBefore(LocalDateTime.now())) {
      localInstant = localInstant.plusDays(1)
    }
    const helsinkiZoned = localInstant.atZone(ZoneId.of('Europe/Helsinki'))
    const utcInstant = helsinkiZoned.withZoneSameInstant(ZoneId.UTC)
    props.onChange(JSJoda.convert(utcInstant).toDate())
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

function timeStrFromDate(date) {
  return date !== undefined ?
    toHelsinkiTime(ZonedDateTime.from(JSJoda.nativeJs(date))).format(DateTimeFormatter.ofPattern('HH:mm')) :
    ''
}

function toHelsinkiTime(zdt) {
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

function LabeledControl(props) {
  const classes = labelStyles()

  return <FormControlLabel
    control={props.control}
    label={props.label}
    labelPlacement="top"
    className={props.center ? '' : classes.leftAlignedLabel}
    classes={{ label: classes.label }}
  />
}
