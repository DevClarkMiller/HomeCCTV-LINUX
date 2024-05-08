const path = require('path');
const express = require("express");
const NodeWebcam = require('node-webcam');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { exec } = require('child_process');  //For executing commands
const os = require('os');
const config = require('./cam-config.json');

const FSWebcam = NodeWebcam.FSWebcam;



//Keeps track of numer of consecutive errors. If beyond a certain number, will restart camera
let errorCount = 0;

//The session id for the webcam, used for the command to restart them
//NOTE * Session ID doesn't seem to change on system reboot
//const enableCam = `pnputil /enable-device "${config.CAM_SESSION_ID}"`; //Command to enable the cam
//const disableCam = `pnputil /disable-device "${config.CAM_SESSION_ID}"`; //Command to disable the cam

app.use('/images', express.static(path.join(__dirname, 'images')));

/*
const executeCommand = async (command) =>{
  await exec(command, (error, stdout, stderr) =>{
    if(error){
      console.error(`Error executing command: ${error.message}`);
      return;
    } 
    if(stderr){
      console.error(`Error output: ${stderr}`);
      return;
    }
    console.log(`Command output: \n${stdout}`);
  });
}*/

/*
const restartCam = async () =>{
  await executeCommand(disableCam); //Disables camera first
  await executeCommand(enableCam);  //Then enables it so that it gets rebooted 😂
  errorCount = 0;
}*/

//Webcam settings
var opts = {
    //Picture related
    width: 640,
    height: 360,
    quality: 100,
    delay: 0,
    output: "jpeg",
    callbackReturn: "base64"
};

var Webcam = new FSWebcam( opts );
console.log(WebCam);

//Captures an image from camera every second and sends the data over to the site!
setInterval(async () => {
    Webcam.capture("images/camOutput", function(err, imageData) {
      /*if(errorCount >= config.ERROR_LIMIT && config.REBOOT_CAM){
        restartCam();
      }*/
      //const imagePath = path.join(__dirname, 'images', 'test_picture');
      if (err) {
        //console.log(errorCount);
        console.error(err);
        errorCount++;
        return;
      }
      errorCount = 0;
      console.log("picture taken!");
      const mimeType = 'image/jpeg'; // Adjust based on image type

      //Buffer.from(imageData).toString('base64') not needed 😊
      io.emit('image-data', {
        data: imageData,
        mimeType,
        // Consider image resizing on the client-side 
        width: opts.width,
        height: opts.height,
        cam: 1
      });

    }); // Add closing parenthesis here
}, config.CAPTURE_INTERVAL);

  
//const imagePath = path.join(__dirname, 'images', 'josiePic.JPG');

app.get('/', (req, res) =>{
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', socket => {
    console.log(`Client connected with an id of: ${socket.id}`);    
    let ips = [];

    const networkInterfaces = os.networkInterfaces();
    // Loop through network interfaces and find the IP address
    Object.keys(networkInterfaces).forEach(iface => {
      for (const address of networkInterfaces[iface]) {
        if (!address.internal && address.family === 'IPv4') {
          ips.push(address.address);
        }
      }
    });

    const localIpAddress = (ips.length > 1) ? ips[1] : ips[0];
    console.log(localIpAddress);

    io.emit('ip-data', {
      ip: localIpAddress
    });
})


server.listen(config.PORT, '0.0.0.0');