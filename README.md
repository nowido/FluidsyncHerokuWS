# FluidSync

## Introduction

**FluidSync** is *a very simple* implementation of Publish/Subscribe pattern. It is Node.js project hosted on Heroku platform.

Developers can access **FluidSync** service with a client library.

For browser:

```
<script src="https://fluidsync-8f7e4.firebaseapp.com/fluidsync_ws.js"></script>
```

For Node.js:

```
$npm install fluidsync_ws_client

... 

const FluidSyncClient = require('fluidsync_ws_client');
```

‘Get started’ publisher code:

```
let fluidsync = new FluidSyncClient();

fluidsync.addEventListener('open', (fluidsync) => {
    console.log('connected [' + fluidsync.id + ']');
    // now we can publish
    fluidsync.publish({channel: 'awesomechannel', from: fluidsync.id, payload: 'awesome message'});
});
```

‘Get started’ subscriber code:

```
let fluidsync = new FluidSyncClient();

fluidsync.addEventListener('open', (fluidsync) => {
    console.log('connected [' + fluidsync.id + ']');               
    fluidsync.subscribe('awesomechannel');
});

fluidsync.addEventListener('awesomechannel', (fluidsync, message) => {
    console.log(message);    
});                      
```

## FluidSync commands

**FluidSync** provides three main actions: *publish*, *subscribe*, and *unsubscribe*.

*publish* takes an object with 3 members:

```
let message = 
{
    channel: <string, channel to publish on>, 
    from: <string, publisher id>, 
    payload: <Object, anything you want to publish>
};

fluidsync.publish(message);
```

> FluidSync is oriented for short messages exchange. Currently, there is a constraint (8 KB) on maximum message length. It means, transport size, including protocol overhead. Simply put, user message will be tagged with additional field ‘action’ (which can have values ‘publish’, ‘subscribe’, or ‘unsubscribe’), then JSON-stringified, and transmitted as UTF-8 string through WebSocket.


Both *subscribe* and *unsubscribe* take a string:

```
fluidsync.subscribe(<string, channel to listen on>);

fluidsync.unsubscribe(<string, channel to drop>);
```

**FluidSync** destroys client’s subscriptions when client socket is disconnected. Clients have to (re)subscribe on (re)connection. A good practice is to set up needed subscriptions on `‘open’` event:

```
fluidsync.addEventListener('open', (fluidsync) => {
    fluidsync.subscribe(...);
});
```

At present, **FluidSync** doesn’t support *arrays of channels* for multiple subscriptions in one *subscribe* action. You need to subscribe several times if you want to listen on several channels. (The same for *unsubscribe*.)

## FluidSync client events

**FluidSync** emits following events:

`’open’`

when client socket is open; handler is `function(fluidsync){...}`

`’close’`

when client socket is closed; handler is `function(fluidsync, <number code>, <string reason>){...}`

`’error’`

when socket error occured; handler is `function(fluidsync){...}`

`’message’`

when socket receives incoming message; handler is `function(fluidsync, <string, rawMessage>){...}`

> Note: this general handler interferes with channel messages listeners; if `‘message’` handler is present, no channel messages listeners will be called, so you need to dispatch raw messages manually from this general handler

`’pong’`

when client receives ‘pong’ answer from server (‘pings’ are sent by client periodically); handler is `function(fluidsync){...}`

You can add/remove handlers with `addEventListener` and `removeEventListener`:

```
fluidsync.addEventListener(<string, event type>, <function, handler of event type>);
fluidsync.removeEventListener(<string, event type>, <function, handler of event type>);
```

You can also add/remove listeners for incoming channel messages:

```
const channel = <string, user channel>;

function onChannelMessage(fluidsync, <Object, parsed message>)
{...}

fluidsync.addEventListener(channel, onChannelMessage);

...

fluidsync.removeEventListener(channel, onChannelMessage);
```

> You should not set both general `‘message’` handler and channel listeners. Only general `‘message’` handler will be called in this case.


## FluidSync service is lightweight and almost stateless

**FluidSync** supports no buffering, no messages queueing, no feedback from the service itself. You have to implement your own protocol over it.

