import React from 'react'
import ReactDOM from 'react-dom'
import { createMuiTheme, CssBaseline, ThemeProvider } from '@material-ui/core'
import App from './App'

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    background: {
      default: '#fff',
    },
  },
})

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <CssBaseline/>
    <App/>
  </ThemeProvider>,
  document.querySelector('#root'),
)
