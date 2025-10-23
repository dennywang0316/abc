// socket connection for anonymous bridge
const socket = io();

// simple connection test
socket.on('connect', function() {
  console.log('connected');
});

socket.on('disconnect', function() {
  console.log('disconnected');
});
