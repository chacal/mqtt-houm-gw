import coap = require('coap')
import {Url} from 'url'


export function getJson(url: Url): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = coap.request(url)
    req.setOption('Accept', 'application/json')
    sendAndHandleResponse(req, resolve, reject)
  })
}

export function postJson(url: Url, payload: Object, confirmable: boolean = true): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = coap.request({
      hostname: url.hostname,
      method: 'POST',
      pathname: url.pathname,
      query: url.query,
      confirmable
    })
    req.setOption('Content-Format', 'application/json')
    req.write(JSON.stringify(payload))
    sendAndHandleResponse(req, resolve, reject)
  })
}

function sendAndHandleResponse(request: any, resolve: (value?: any) => void, reject: (reason?: any) => void) {
  request.on('response', res => res.code.startsWith('2.') ? resolve(res) : reject(res))
  request.on('timeout', err => reject(err))
  request.on('error', err => reject(err))
  request.end()
}