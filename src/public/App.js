const { useEffect, useState } = React
const { Typography, FormControlLabel, makeStyles, Grid, Switch } = MaterialUI

const appStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(3)
  }
}))

function App() {
  const classes = appStyles()
  const [heaterState, setHeaterState] = useState({ timerEnabled: false })

  useEffect(() => {
    loadHeaterState(setHeaterState)
  }, [])

  function readyTimeChanged(readyTime) {
    const newState = { ...heaterState, readyTime }
    setHeaterState(newState)
    saveHeaterState(newState, setHeaterState)
  }

  function timerEnabledChanged(e) {
    const newState = { ...heaterState, timerEnabled: e.target.checked }
    setHeaterState(newState)
    saveHeaterState(newState, setHeaterState)
  }

  return (
    <Container maxWidth='xs' className={classes.root}>
      <h1>Car heater</h1>
      <Grid container spacing={4}>
        <Grid item xs={6}>
          <LabeledControl
            control={<TimeField time={heaterState.readyTime} onChange={readyTimeChanged}/>}
            label="Ready time"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Switch checked={heaterState.timerEnabled} onChange={timerEnabledChanged}/>}
            label="Timer enabled"
            center
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>{formatHeatingStart(heaterState.heatingStart)}</Typography>}
            label="Heating start time"
          />
        </Grid>
        <Grid item xs={6}>
          <LabeledControl
            control={<Typography>-</Typography>}
            label="Heater state"
          />
        </Grid>
      </Grid>
    </Container>
  )
}

function formatHeatingStart(heatingStart) {
  if (heatingStart !== undefined) {
    const prefix = new Date().getDay() === heatingStart.getDay() ? 'Today ' : 'Tomorrow '
    return prefix + timeStrFromDate(heatingStart)
  } else {
    return ''
  }
}

function loadHeaterState(setHeaterState) {
  fetch(`/heater`)
    .then(res => handleStateResponse(res, setHeaterState))
}

function saveHeaterState(stateToSave, setHeaterState) {
  fetch('/heater', {
    method: 'POST',
    body: JSON.stringify(stateToSave),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => handleStateResponse(res, setHeaterState))
}

function handleStateResponse(res, setHeaterState) {
  res.json()
    .then(heaterStateFromJSON)
    .then(setHeaterState)
}

function heaterStateFromJSON(jsonState) {
  return {
    readyTime: new Date(jsonState.readyTime),
    heatingStart: new Date(jsonState.heatingStart),
    timerEnabled: jsonState.timerEnabled
  }
}