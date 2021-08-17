import { gql, GraphQLClient } from 'graphql-request'
import _ from 'lodash'

export interface HslArrival {
  arriveTs: Date
  realtime: boolean
  realtimeState: string
  route: string
}

const stopArrivalsQuery = gql`
query Arrivals($stopId: String!){
  stop(id: $stopId) {
    name
    stoptimesWithoutPatterns(numberOfDepartures: 8) {
      serviceDay
      scheduledArrival
      realtimeArrival
      arrivalDelay
      realtime
      realtimeState
      trip {
        routeShortName
      }
    }
  }
}
`

export function getStopArrivals(stopId: string) {
  console.log('Getting arrivals', stopId)
  const client = new GraphQLClient('https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql')
  return client.request(stopArrivalsQuery, { stopId })
    .then(parseHslStopResponse)
}

function parseHslStopResponse(res: any): HslArrival[] {
  const arrivals = res.stop.stoptimesWithoutPatterns.map((arr: any) => ({
      arriveTs: new Date((arr.serviceDay + arr.realtimeArrival) * 1000),
      realtime: arr.realtime,
      realtimeState: arr.realtimeState,
      route: arr.trip.routeShortName
    })
  )

  return _.sortBy(arrivals, a => a.arriveTs)
}
