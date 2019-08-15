
//window.onload begins
window.onload=function(){

function getFreqForKey(key){
  if(key=='a'){
    return 130.8;
  }
  if(key=='w'){
    return 138.6;
  }
  if(key=='s'){
    return 146.8;
  }
  if(key=='e'){
    return 155.6;
  }
  if(key=='d'){
    return 164.8;
  }
  if(key=='f'){
    return 174.6;
  }
  if(key=='t'){
    return 185.0;
  }
  if(key=='g'){
    return 196.0;
  }
  if(key=='y'){
    return 207.7;
  }
  if(key=='h'){
    return 220.0;
  }
  if(key=='u'){
    return 233.1;
  }
  if(key=='j'){
    return 246.9;
  }
}

var createJSONDetails=function(type,frequency){
  return {"osctype":type, "oscfrequency":frequency};
}

function setFromUI(){
   //To get Which Type
   var radioButtons = document.getElementsByName("osctype");
    for(var i = 0; i < radioButtons.length; i++)
    {
        if(radioButtons[i].checked == true)
        {
            osm.setOscNodeType(radioButtons[i].value);
        }
    }
  //console.log("Current Osc Type: "+osm.getOscNodeType());
  var slider1 = document.getElementById("slider1");
  requestAnimationFrame(setFromUI);
  //works
}


//BiQuadFilterBegins
class BiQuadFilter{

  constructor(){
    this.biquadfilter = audioCtx.createBiquadFilter();
    this.biquadfilter.type="lowshelf";
    this.biquadfilter.frequency=1000;
    this.biquadfilter.gain=25;
    this.biquadfilter.q=1;
    this.biquadfilter.detune=0;
    return this.biquadfilter;
  }

  updateParameters=function(jsonobj){
    //jsonobj={"updatetype":"","val":""}
    var utype=jsonobj.updatetype;
    var uvalue=jsonobj.val;
    if(utype=="type"){
      if (this.getDetails().type.includes(uvalue)){
        this.biquadfilter.type.setValueAtTime(uvalue,audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
    } else if(utype=="frequency"){
      if(uvalue<=this.getDetails().frequency.max && uvalue>=this.getDetails().frequency.min){
        this.biquadfilter.frequency.setValueAtTime(uvalue, audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
      // current filtering freq: default is 350 with range from 10 to 0.5*sample rate
    } else if(utype=="gain"){
      if(uvalue<=this.getDetails().gain.max && uvalue>=this.getDetails().gain.min){
        this.biquadfilter.gain.setValueAtTime(uvalue, audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
      //dB default is zero, set from -40 to +40; -ve gain is attenuation
    } else if(utype=="q"){
      if(uvalue<=this.getDetails().q.max && uvalue>=this.getDetails().q.min){
        this.biquadfilter.Q.setValueAtTime(uvalue,audioCtx.currentTime); //between 0.0001 to 1000
        return true;
      }else{
        return false;
      }
    } else if(utype=="detune"){
      if(uvalue<=this.getDetails().detune.max && uvalue>=this.getDetails().detune.min){
        this.biquadfilter.detune.setValueAtTime(uvalue,audioCtx.currentTime);   
        return true;
      }else{
        return false;
      }
    }
  }

  getDetails=function(){
    return {"type":["lowpass","highpass","bandpass","lowshelf","highshelf","peaking","notch","allpass"],
            "frequency":{"min":"10","max":"22050","default":"350"},
            "gain":{"min":"-40","max":"40","default":"0"},
            "q":{"min":"0.0001","max":"1000","default":"1"},
            "detune":{"min":"-1000","max":"1000","default":"0"}
          };
  }

  getFrequencyResponse=function(){
    var arrvalues=[20,25,31,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
    var myFrequencyArray = new Float32Array(31);
    for(var i=0;i<31;i++){myFrequencyArray[i] = arrvalues[i];}
    var magResponseOutput = new Float32Array(31);
    var phaseResponseOutput = new Float32Array(31);
    biquadFilter.getFrequencyResponse(myFrequencyArray,magResponseOutput,phaseResponseOutput);
    var jsonArr=[];
    for(i = 0; i <= myFrequencyArray.length-1;i++){
      jsonArr.push({"F":myFrequencyArray[i],"M":magResponseOutput[i],"P":phaseResponseOutput[i]})
       //myFrequencyArray[i] + 'Hz Magnitude response value' Phase response in radians.';
    }
    return jsonArr;
  }
}//BiQuadFilter ends

//Error for reverb
class Convolver{
  constructor(){
    var reverb = audioCtx.createConvolver();
    var reverbSoundArrayBuffer = this.base64ToArrayBuffer(impulseResponse);
    audioCtx.decodeAudioData(reverbSoundArrayBuffer, 
      function(buffer) {
        reverb.buffer = buffer;
      },
      function(e) {
        alert('Error when decoding audio data ' + e.err);
    });
  }

  base64ToArrayBuffer=function(base64) {
      var binaryString = window.atob(base64);
      var len = binaryString.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++)        {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
  }
}

//Class delay begins
class Delay{

  constructor(){
      this.synthDelay=audioCtx.createDelay(5.0);
      return this.synthDelay;
      //delayTime in seconds and its min val is zero, and max is maxDelayTime argument while creating, here it's 5.0
  }

  updateParameters=function(jsonobj){
    if(jsonobj.updatetype=="delaytime"){
      if(jsonobj.val>=this.getDetails().delaytime.min && jsonobj.val<=this.getDetails().delaytime.max){
        this.synthDelay.delayTime.setValueAtTime(jsonobj.val, audioCtx.currentTime);  
        return true;
      }else{
        return false;
      }
    }
  }

  getDetails=function(){
    return {"delaytime":{"min":"0","max":"10.0","default":"5.0"}};
  }
}// Class Delay ends

//Class Dynamics Compressor
class DynamicsCompressor{

  constructor(){
    this.compressor = audioCtx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-50, audioCtx.currentTime); //default -24: threshhold -100 and 0
    this.compressor.knee.setValueAtTime(40, audioCtx.currentTime); // default 30: knee 0 and 40
    this.compressor.ratio.setValueAtTime(12, audioCtx.currentTime); // def:12 ratio 1 and 20
    this.compressor.attack.setValueAtTime(0, audioCtx.currentTime); //def: 0.003, btw 0 and 1 attack
    this.compressor.release.setValueAtTime(0.25, audioCtx.currentTime); //def 0.25, btw 0 and 1 release
    return this.compressor;
  }

  updateParameters=function(jsonobj){
    //jsonobj={"updatetype":"","val":""}
    var utype=jsonobj.updatetype;
    var uvalue=jsonobj.val;
    if(utype=="threshold"){
      if (uvalue<=this.getDetails().threshold.max && uvalue>=this.getDetails().threshold.min){
        this.compressor.threshold.setValueAtTime(uvalue,audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
    } else if(utype=="knee"){
      if(uvalue<=this.getDetails().knee.max && uvalue>=this.getDetails().knee.min){
        this.compressor.knee.setValueAtTime(uvalue, audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
      // current filtering freq: default is 350 with range from 10 to 0.5*sample rate
    } else if(utype=="ratio"){
      if(uvalue<=this.getDetails().ratio.max && uvalue>=this.getDetails().ratio.min){
        this.compressor.ratio.setValueAtTime(uvalue, audioCtx.currentTime);
        return true;
      }else{
        return false;
      }
      //dB default is zero, set from -40 to +40; -ve gain is attenuation
    } else if(utype=="attack"){
      if(uvalue<=this.getDetails().attack.max && uvalue>=this.getDetails().attack.min){
        this.compressor.attack.setValueAtTime(uvalue,audioCtx.currentTime); //between 0.0001 to 1000
        return true;
      }else{
        return false;
      }
    } else if(utype=="release"){
      if(uvalue<=this.getDetails().release.max && uvalue>=this.getDetails().release.min){
        this.compressor.release.setValueAtTime(uvalue,audioCtx.currentTime);   
        return true;
      }else{
        return false;
      }
    }
  }

  getHelpText=function(){
    return "The DynamicsCompressorNode interface provides a compression effect, which lowers the volume of the loudest parts of the signal in order to help prevent clipping and distortion that can occur when multiple sounds are played and multiplexed together at once.";
  }

  getReduction=function(){
    return this.compressor.reduction; //read only property, range between -20 and 0
  }

  getDetails=function(){
    return {"threshold":{"min":"-100","max":"0","default":"-24"},
            "knee":{"min":"0","max":"40","default":"30"},
            "ratio":{"min":"1","max":"20","default":"12"},
            "attack":{"min":"0","max":"1","default":"0.003"},
            "release":{"min":"0","max":"1","default":"0.25"}
          };
  }
}//Class DynamicsCompressor ends

//Class Gain
class Gain{

  constructor(){
    this.gainNode = audioCtx.createGain();
    return this;
  }

  updateParameters=function(jsonobj){
    if(jsonobj.updatetype=="gain"){
      if(jsonobj.val>=this.getDetails().gain.min && jsonobj.val<=this.getDetails().gain.max){
        this.gainNode.gain.setValueAtTime(jsonobj.val, audioCtx.currentTime);  
        return true;
      }else{
        return false;
      }
    }
  }

  getDetails=function(){
    return {"gain":{"min":"0","max":"1","default":"0.5"}};
  }
}//Class Gain ends

//Class MediaElementAS
class MediaElementAudioSource{
  constructor(){
  this.myAudio = document.querySelector('audio');
  //basically have user update the <audio> html tag with their music and then create a node source
  this.source = audioCtx.createMediaElementSource(this.myAudio);
  return this.source
  }
}//class MEAS ends

//CLass MediaStreamAudioSource for audio mic input
class MediaStreamAudioSource{
  constructor(audioCtx){
    if (navigator.mediaDevices) {
      console.log('getUserMedia supported.');
      navigator.mediaDevices.getUserMedia ({audio: true})
      .then(function(stream) {
          this.source = audioCtx.createMediaStreamSource(stream);
          return this.source;
      }).catch(function(err) {
          console.log('The following gUM error occured: ' + err);
      });
    }else {
      console.log('getUserMedia not supported on your browser!');
    }    
  }
}// class MediaStreamAS ends

//Class Stereo Panner
class StereoPanner{

  constructor(){
    this.panNode = audioCtx.createStereoPanner();
    return this.panNode;
  }

  updateParameters=function(jsonobj){
    if(jsonobj.updatetype=="pan"){
      if(jsonobj.val>=this.getDetails().pan.min && jsonobj.val<=this.getDetails().pan.max){
        this.panNode.pan.setValueAtTime(jsonobj.val, audioCtx.currentTime);// range between -1(full Left) to 1 (full right)
        return true;
      }else{
        return false;
      }
    }
  }

  getDetails=function(){
    return {"pan":{"min":"-1","max":"1","default":"0"}};
  }
}//Class StereoPanner ends

//Class WaveShaper
class WaveShaper{
  //DISTORTION BRO
  constructor(){
    this.distortion = audioCtx.createWaveShaper();
    this.distortion.curve = makeDistortionCurve(400); //check how it sounds and map the value from 0 to maybe something
    this.distortion.oversample = '4x';
    return this.distortion;
  }

  makeDistortionCurve=function(amount) {
    var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };

  updateParameters=function(jsonobj){
    if(jsonobj.updatetype=="curve"){
      if(jsonobj.val>=this.getDetails().curve.min && jsonobj.val<=this.getDetails().curve.max){
        this.distortion.curve.setValueAtTime(this.makeDistortionCurve(jsonobj.val), audioCtx.currentTime);  
        return true;
      }else{
        return false;
      }
    } else if(jsonobj.updatetype=="oversample"){
      if(this.getDetails().oversample.includes(jsonobj.val)){
        this.distortion.oversample.setValueAtTime(jsonobj.val, audioCtx.currentTime);  
        return true;
      }else{
        return false;
      }
    }
  }

  getDetails=function(){
    return {"oversample":["none","2x","4x"],
            "curve":{"min":"0","max":"1000","default":"400"}};
  }
}//WaveShaper ends

//-------------------GLOBAL ACTIONS TO BE DONE--------------------

//Create Audio Context Global
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

//Create new AudioNodeManager
var anm=new AudioNodeManager();

//Create an OscManager
var osm=new OscManager();

//for connecting all osc input to this node
var osmanalyser=audioCtx.createAnalyser();

//Connect osmanalyser to the preferred node -- has to be done by AudioNode manager after adding it and connectUpdate() following
osmanalyser.connect(audioCtx.destination);

//Diff types of waves available for synthesis by Oscillator
var types=["sine", "square", "sawtooth", "triangle"];

//Define Keyboard Area
var keyboard=new p5(keyboardsketch);

//Define Pitch Bend Area
var pitcharea=new p5(pitchareasketch);

//Initiate first call to check for changes
setFromUI();




//---------------------------REFERENCES------------------------------

//mods
/*
function setup() {
  var cnv = createCanvas(100, 100);
  var x = (windowWidth - width) / 2;
  var y = (windowHeight - height) / 2;
  cnv.position(x, y);
  background(255, 0, 200);
}
*/

// var a=new Oscillator("sine",440);
// a.play();
// a.detune(-900);

/*
function random(max) {
  return Math.floor(Math.random() * max);
}

function addStar(type, zIndex) {
  var div = document.createElement("div");
  div.classList.add("star", type);
  div.style.top = random(window.innerHeight) + "px";
  div.style.zIndex = zIndex;
  document.body.appendChild(div);
}
*/

/*

"1":audioCtx,"status":"on"/"off","divID":"audionode1"},
              "2":OscManager,
              "3":Analyzer,
              "3": Gain AudioNodeManager,
              "4":Filter,
              "5":Analyzer,
              "6":Destination

*/

/*
var Foo = (function() {

// number times instantiated
var instances = 0

return function() {

// unique instance number
var _instance = ++instances;

// get object instance number
this.getInstanceNum = function() {
return _instance;
};

};

})();
*/




}
//window.onload ends
