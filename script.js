const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const RoomName = document.getElementById('room-id');
  const members = document.getElementById('members');
  const memberlist = document.getElementById('room_member');

  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .catch();

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: "128a6127-04a4-460b-a1be-cffdbb47c756",
    debug: 3,
  }));

  // Register join handler
  joinTrigger.addEventListener('click', () => {
    RoomName.innerHTML = "部屋:" + roomId.value;
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      stream: localStream,
    });

    room.once('open', () => {
      const newmember = document.createElement('p');
      newmember.innerHTML = `YourID:${peer.id}`
      // mark peerId to find it later at peerLeave event
      newmember.setAttribute('data-peer-id', peer.id);
      memberlist.append(newmember);
      
      messages.textContent += '=== You joined ===\n';
    });
    // room.on('peerJoin', peerId => {
    // });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newmember = document.createElement('p');
      newmember.innerHTML = `・${stream.peerId}`
      // mark peerId to find it later at peerLeave event
      newmember.setAttribute('data-peer-id', stream.peerId);
      memberlist.append(newmember);

      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteyou = memberlist.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteyou.remove();

      const remotemember = memberlist.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remotemember.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    room.once('close', () => {
      const remotemember = memberlist.querySelector(
        `[data-peer-id="${peer.id}"]`
      );
      remotemember.remove();
      
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => {
      RoomName.innerHTML = "";
      room.close(), { once: true }
    });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();