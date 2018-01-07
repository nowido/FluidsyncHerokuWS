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

## Why Heroku?

[Heroku](https://www.heroku.com) grants a generous free hosting. Verified accounts (credit card needed) get 1000 monthly *dyno* hours for absolutely free. So, **FluidSync** service runs 24 hours a day.

## FluidSync commands

**FluidSync** provides two main actions: *publish* and *subscribe*.

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

*subscribe* takes a string:

```
fluidsync.subscribe(<string, channel to listen on>);
```

**FluidSync** destroys client’s subscriptions when client socket is disconnected. Clients have to (re)subscribe on (re)connection. A good practice is to set up needed subscriptions on ‘open’ event:

```
fluidsync.addEventListener('open', (fluidsync) => {
    fluidsync.subscribe(...);
});
```

At present, **FluidSync** doesn’t support *arrays of channels* for multiple subscriptions in one ‘subscribe’ action. You need to subscribe several times if you want to listen on several channels.

## FluidSync service is lightweight and almost stateless

**FluidSync** supports no buffering, no messages queueing, no feedback from the service itself. You have to implement your own protocol over it.

