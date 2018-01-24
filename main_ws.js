const http = require('http');
const WebSocket = require('ws');

const httpServer = http.createServer((req, res) => {

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.end('OK');
});

//----------------------------------------------------------------------

var registry = 
{
        // Map to store sockets subscribed for 'some channel'
    channels: new Map(),

        // Map to store channels socket 'socket.id' is subscribed to
        // (reverse registry to speed up cleanup when disconnect)
    socketsSubscriptions: new Map()
};

function registerSubscription(channelId, socketId)
{
    if((typeof channelId === 'string') && (channelId.length > 0))
    {
        // direct registry (channels -> sockets)

        addGeneral(registry.channels, channelId, socketId);

        // reverse registry (sockets -> channels)

        addGeneral(registry.socketsSubscriptions, socketId, channelId);
    }
}

function removeSubscription(channelId, socketId)
{
    if((typeof channelId === 'string') && (channelId.length > 0))
    {
        // direct registry (channels -> sockets)

        deleteGeneral(registry.channels, channelId, socketId);

        // reverse registry (sockets -> channels)

        deleteGeneral(registry.socketsSubscriptions, socketId, channelId);
    }
}

function addGeneral(mapObject, mapKey, elementOfSet)
{
    let entry = mapObject.get(mapKey);

    if(entry === undefined)
    {
        mapObject.set(mapKey, new Set([elementOfSet]));
    }
    else
    {
        entry.add(elementOfSet);
    }        
}

function deleteGeneral(mapObject, mapKey, elementOfSet)
{
    let entry = mapObject.get(mapKey);
    
    if(entry !== undefined)
    {
        entry.delete(elementOfSet);
        
        if(entry.size === 0)
        {
            mapObject.delete(mapKey);    
        }
    }
}

function removeAllSubscriptions(socketId)
{
    let socketsSubscriptions = registry.socketsSubscriptions;

    let socketChannels = socketsSubscriptions.get(socketId);

    if(socketChannels !== undefined)
    {
        let channels = registry.channels;

        socketChannels.forEach(channelId => {       
                 
            deleteGeneral(channels, channelId, socketId);
        });

        socketsSubscriptions.delete(socketId);
    }
}

function publish(channelId, rawMessage)
{
    if((typeof channelId === 'string') && (channelId.length > 0))
    {
        let subscribers = registry.channels.get(channelId);

        if(subscribers !== undefined)
        {
            subscribers.forEach(socket => {

                if(socket && (socket.readyState === WebSocket.OPEN))
                {
                    socket.send(rawMessage);
                }                                
            });
        }
    }   
}

//----------------------------------------------------------------------

const wss = new WebSocket.Server({
    server: httpServer, 
    clientTracking: false,
    perMessageDeflate: false,
    //maxPayload: 8 * 1024
});

const appLayerPingMessage = 'fluidsync-ping';
const appLayerPongMessage = 'fluidsync-pong';

function socketHandlerClose(e)
{
    // e.target === socket
    // e.wasClean
    // e.reason
    // e.code

    //console.log('closed by reason: ' + e.code);  
    
    let socket = e.target;

    removeAllSubscriptions(socket);

    socket.removeEventListener('close', socketHandlerClose);
    socket.removeEventListener('message', socketHandlerMessage);   
    socket.removeEventListener('error', socketHandlerError);   
    socket.removeEventListener('ping', socketHandlerPing);
    socket.removeEventListener('pong', socketHandlerPong); 
}

function socketHandlerMessage(e)
{    
    let data = e.data;  
    
    let socket = e.target;

    if((typeof data === 'string') && (data.length > 0))
    {
        //console.log('message: ' + data);  
        
        if(data === appLayerPingMessage)
        {
            if(socket && (socket.readyState === WebSocket.OPEN))
            {
                socket.send(appLayerPongMessage);
            }    

            return;
        }

        try
        {
            let receivedObject = JSON.parse(data);

            // receivedObject.action {'publish', 'subscribe', 'unsubscribe'}

            // receivedObject.channel (must always be present)
            // receivedObject.from (must be present if action is 'publish', but it is not checked for now)
            // receivedObject.payload (must be present if action is 'publish')

            let action = receivedObject.action;

            if(action === 'subscribe')
            {
                registerSubscription(receivedObject.channel, socket);
            }
            else if(action === 'unsubscribe')
            {
                removeSubscription(receivedObject.channel, socket);    
            }
            else if(action === 'publish')
            {                
                publish(receivedObject.channel, data);
            }
        }
        catch(e)
        {}
    }    
}

function socketHandlerError(e)
{    
    //console.log('socket error: ' + e.message);  
}

function socketHandlerPing(e)
{        
    //console.log('socket ping');  

    let socket = e.target;

    if(socket && (socket.readyState === WebSocket.OPEN))
    {
        socket.pong(e.data);
    }    
}

function socketHandlerPong(e)
{        
    //console.log('socket pong');  
    //console.log(e.data);
}

function handleNewClient(socket, req)
{
    //console.log('connection: ' + req.headers['sec-websocket-key']); 
    
    socket.addEventListener('close', socketHandlerClose);
    socket.addEventListener('message', socketHandlerMessage);
    socket.addEventListener('error', socketHandlerError);
    socket.addEventListener('ping', socketHandlerPing);    
    socket.addEventListener('pong', socketHandlerPong);
}

wss.on('connection', handleNewClient);    

wss.on('error', (err) => {
    //console.log(err);
});    

//----------------------------------------------------------------------

process.on('uncaughtException', (err) => {    
    //console.log(err);
});

//----------------------------------------------------------------------

const PERIOD = 15 * 60 * 1000;

const pingTarget = 'fluidsync2.herokuapp.com';
const pingOptions = { hostname: pingTarget };

setInterval(() => {
    const pingRequest = http.request(pingOptions);    
    pingRequest.end();
}, PERIOD);

//----------------------------------------------------------------------

httpServer.listen(process.env.PORT, () => {
  console.log('Server running...');
});
