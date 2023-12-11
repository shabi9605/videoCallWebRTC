console.log('In main.js!')

var mapPeers = {};

var usernameInput = document.querySelector("#username");
var btnJoin = document.querySelector("#btn-join");

var username;

var webSocket;

function webSocketOnMessage(event){
    var parsedData = JSON.parse(event.data);

    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if(username == peerUsername){
        return;
    }

    var receiver_channel_name = parsedData['message']['receiver_channel_name'];

    if(action == 'new-peer'){
        createOfferer(peerUsername, receiver_channel_name);

        return;
    }

    if(action == 'new-offer'){
        var offer = parsedData['message']['sdp'];

        creteAnswerer(offer, peerUsername, receiver_channel_name);

        return;
    }

    
}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    console.log('username: ',username);

    if(username == ''){
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector("#label-username");
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = 'ws://';

    if(loc.protocol == 'https:'){
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname;

    console.log('endPoint: ',endPoint);

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        console.log("Connection Opened");

       sendSignal('new-peer', {})
    });

    webSocket.addEventListener('message', webSocketOnMessage);

    webSocket.addEventListener('close', (e) => {
        console.log("Connection Closed")
    });

    webSocket.addEventListener('error', (e) => {
        console.log("Error Occurred!")
    });
});


var localStream = new MediaStream();

const constraints = {
    'video': true,
    'audio': true
};

const localVideo = document.querySelector("#local-video");

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;
    })
    .catch(error => {
        console.log("Error accessing media devices. ",error);
    });


    

function sendSignal(action, message){
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });

    webSocket.send(jsonStr);
}


function createOfferer(peerUsername, receiver_channel_name){
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);
    
    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log("Connection opened!");
    });
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if(iceConnectionState != 'closed'){
                peer.close();
            }

            remoteVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if(event.candidate){
            console.log("New ice candidate: ",JSON.stringify(peer.localDescription));

            return;
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });

       
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log
            ('Local description set successfully')
        })
}

function creteAnswerer(offer, peerUsername,receiver_channel_name){
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);
    

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('dataChannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log("Connection opened!");
        });
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    })

    

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];

            if(iceConnectionState != 'closed'){
                peer.close();
            }

            remoteVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event) => {
        if(event.candidate){
            console.log("New ice candidate: ",JSON.stringify(peer.localDescription));

            return;
        }

        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });

       
    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Remote description set successfully for %s.', peerUsername);
            peer.createAnswer();
        })
        .then(a => {
            console.log('Answer created')
        })

    
}


function addLocalTracks(peer){
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    return;
}

var messageList = document.querySelector('#message-list');

function dcOnMessage(event){
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');

    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videWrapper = document.createElement('div');

    videoContainer.appendChild(remoteVideo);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    })
}

function remoteVideo(remoteVideo){
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}