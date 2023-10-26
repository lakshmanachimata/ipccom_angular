export interface ClientApp {
  provider: string
  events: Event[]
}

export interface Event {
  eventname: string
  subsribers: string[]
}
