var gl;//the canvas context
var drawings = [];//the list of things being drawn
var shaderProgram;

//matrices
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

//personal movement
var thetaX = 0;
var thetaY = 0;
var thetaZ = 0;
var move = [1,0];
worldShift = [0,0,0];

//final objects
var sphere;
var cyllinder;
var cube;

function DrawableFactory(shaderAttributeNames){
  return {
    "new": function(drawMod, abscoords){
      thisO = {};
      
      if(drawMod === undefined){
        drawMod = gl.TRIANGLES;
        
        if(abscoords === undefined){
          abscoords = [0,0,0];
        }
      }
      thisO.drawMod = drawMod;
      thisO.coords = abscoords;
      thisO.rotation = [0.0, 0.0, 0.0];
      
      thisO.shadeAttribs = {};
      thisO.shadeObjs = {};
      for(var i=0;i<shaderAttributeNames.length;i++){
        thisO.shadeAttribs[shaderAttributeNames[i]] = [];
        thisO.shadeObjs[shaderAttributeNames[i]] = gl.createBuffer();
      }
      thisO.copy = function(){
        return new Drawable(JSON.parse(JSON.stringify(this.shadeAttribs)), this.drawMod, this.coords);
      };
    
      thisO.stretch = function(arr3){
        var o = this.copy().shadeAttribs;
        for(var i=0;i<o.vertexPositionBuffer.length;i+=3){
          for(var j=0;j<3;j++){
            o.vertexPositionBuffer[i+j] = o.vertexPositionBuffer[i+j]*arr3[j];
          }
        }
        return o;
      };
      
      return thisO;
    },
    
    "shaderAttributeNames": shaderAttributeNames,
  };
}

class Drawable{//would work well as a factory^^^^ see drawablefactory
  constructor(shaderAttributes, drawMod, abscoords){//for now: shape coord, tex coord, indexies
    this.shadeAttribs = shaderAttributes;
    //console.log(this.shadeAttribs);
    this.shadeObjs = {};
    for(var key in shaderAttributes){
      this.shadeObjs[key] = gl.createBuffer();
    }
    this.drawMod = drawMod;
    this.coords = abscoords;
    this.rotation = [0,0,0];
  }
  
  copy(){
    return new Drawable(JSON.parse(JSON.stringify(this.shadeAttribs)), this.drawMod, this.coords);
  }
  
  stretch(arr3){
    var o = this.copy().shadeAttribs;
    for(var i=0;i<o.vertexPositionBuffer.length;i+=3){
      for(var j=0;j<3;j++){
        o.vertexPositionBuffer[i+j] = o.vertexPositionBuffer[i+j]*arr3[j];
      }
    }
    return o;
  }
}

var myDrawable = DrawableFactory([
    "vertexPositionBuffer", 
    "vertexColorBuffer", 
    "vertexIndexBuffer", 
    "faceNormalBuffer"
  ]);



//from http://inside.mines.edu/fs_home/gmurray/ArbitraryAxisRotation/
function rotate(x, y, z, u, v, w, theta){
  var squareSum = Math.pow(u, 2.0)+Math.pow(v, 2.0)+Math.pow(w, 2.0);
  var cos = Math.cos(theta);
  var sin = Math.sin(theta);
  var multiplied = u*x+v*y+w*z;
  var sqrSquareSum = Math.sqrt(squareSum);

  return [
    (u*multiplied*(1-cos)+squareSum*x*cos+sqrSquareSum*(-w*y+v*z)*sin)/(squareSum),
    (v*multiplied*(1-cos)+squareSum*y*cos+sqrSquareSum*(w*x-u*z)*sin)/(squareSum),
    (w*multiplied*(1-cos)+squareSum*z*cos+sqrSquareSum*(-v*x+u*y)*sin)/(squareSum)
    ];
}


function add(arr1, arr2){
  arrOut = [0,0,0];
  for(var i=0;i<arr1.length && i<arr2.length;i++){
    arrOut[i] = arr1[i]+arr2[i];
  }
  return arrOut;
}

function subtract(arr1, arr2){
  arrOut = [0,0,0];

  for(var i=0;i<arr1.length && i<arr2.length;i++){
    arrOut[i] = arr1[i]-arr2[i];
  }
  return arrOut;
}

function cross(a, b){
  return [
    a[1]*b[2] - a[2]*b[1], 
    a[2]*b[0] - a[0]*b[2], 
    a[0]*b[1] - a[1]*b[0]
  ];
}

function normalize(a){
	var sum = 0;
	for(var i=0;i<a.length;i++){
		sum+=Math.abs(a[i]);
	}
	outArr = [];
	for(var i=0;i<a.length;i++){
		outArr.push(a[i]/sum);
	}
	
	return outArr;
}

function trigNormal(a, b, c){//3 points
  edges = [];
  edges.push(subtract(c, b));
  edges.push(subtract(a, b));

  return normalize(cross(edges[0], edges[1]));
}

function generateNormals(shape){
  var faceNormalBuffer = [];
  for(var i=0; i<shape.shadeAttribs.vertexIndexBuffer.length; i+=3){
    var points = [];
    for(var j=0; j<3; j++){
      var point = [];
      for(var k=0; k<3; k++){
        point.push(shape.shadeAttribs.vertexPositionBuffer[shape.shadeAttribs.vertexIndexBuffer[i+j]*3+k]);
      }
      points.push(point);
    }

    var c = trigNormal(points[0], points[1], points[2]);
    
    c = c.concat(c);
    
    faceNormalBuffer = faceNormalBuffer.concat(
      c
    );
  }
  return faceNormalBuffer;
}


//code for opengl interfacing{
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  var normalMatrix = mat3.create();
  mat4.toInverseMat3(mvMatrix, normalMatrix);
  mat3.transpose(normalMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length === 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}
//}end opengl interfacing code


//code for actually drawing and running{
function drawScene(){
  //clear screen
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0, 0, 0, 0.3);

  //set up view model
  mat4.perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  mat4.identity(mvMatrix);

  //intial camera movement
  mat4.rotate(mvMatrix, thetaX, [1, 0, 0]);
  mat4.rotate(mvMatrix, thetaY, [0, 1, 0]);
  mat4.rotate(mvMatrix, thetaZ, [0, 0, 1]);

  mat4.translate(mvMatrix,  worldShift);

  //loop through drawings and draw
  for(var ii=0;ii<drawings.length;ii++){
    mvPushMatrix();

    mat4.rotate(mvMatrix, drawings[ii].rotation[0], [1, 0, 0]);
    mat4.rotate(mvMatrix, drawings[ii].rotation[1], [0, 1, 0]);
    mat4.rotate(mvMatrix, drawings[ii].rotation[2], [0, 0, 1]);

    mat4.translate(mvMatrix,  drawings[ii].coords);

    //vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, drawings[ii].shadeObjs.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0); 

    //coloring
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, drawings[ii].shadeObjs.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //normals
    gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.faceNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.faceNormalAttribute, drawings[ii].shadeObjs.faceNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //vertex index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);

    setMatrixUniforms();
    gl.drawElements(drawings[ii].drawMod, drawings[ii].shadeObjs.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();
  }
}

function tick(){
  requestAnimationFrame(tick);//register next tick

  //set current rotation
  move = [Math.sin(thetaY)/20, Math.cos(thetaY)/20];

  //check keys and values from keyRegisterer.js
  keyTick();
  
  //draw
  drawScene();
}

function webGLStart() {
  var canvas = document.getElementById("lesson01-canvas");

  //init GL
  {
    try {
      canvas.width=document.body.clientWidth;
      canvas.height=document.body.clientHeight;
      gl = canvas.getContext("experimental-webgl");
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
      alert("Could not initialise WebGL, sorry :-(");
    }
  }
  

  //init shaders
  {//so those vars fragmentShader and vertexShader get removed later
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");
  
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
  
    gl.useProgram(shaderProgram);
  
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  
    shaderProgram.faceNormalAttribute = gl.getAttribLocation(shaderProgram, "aNormal");
    gl.enableVertexAttribArray(shaderProgram.faceNormalAttribute);
  
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    
    shaderProgram.lightDirection = gl.getUniformLocation(shaderProgram, "lightDirection");
    gl.uniform3fv(shaderProgram.lightDirection, normalize([1.0, -1.0, 0.0]));
  }
  
  
  //init buffers
  {
    //

    //add some items to the drawables
    {
      //drawings.push(sphere);
    }
    //  end adding
      
    // go through drawings and generate all their buffers
    for(var ii=0; ii<drawings.length; ii++){
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexPositionBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexPositionBuffer.itemSize = 3;
      drawings[ii].shadeObjs.vertexPositionBuffer.numItems = drawings[ii].shadeAttribs.vertexPositionBuffer.length/3;
      
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexColorBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexColorBuffer.itemSize = 4;
      drawings[ii].shadeObjs.vertexColorBuffer.numItems = drawings[ii].shadeAttribs.vertexColorBuffer.length/4;
  
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.faceNormalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.faceNormalBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.faceNormalBuffer.itemSize = 3;
      drawings[ii].shadeObjs.faceNormalBuffer.numItems = drawings[ii].shadeAttribs.faceNormalBuffer.length/3;
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawings[ii].shadeAttribs.vertexIndexBuffer), gl.STATIC_DRAW);
      drawings[ii].shadeObjs.vertexIndexBuffer.itemSize = 1;
      drawings[ii].shadeObjs.vertexIndexBuffer.numItems = drawings[ii].shadeAttribs.vertexIndexBuffer.length;
    }
    
    console.log(drawings);
  }


  //register key presses with keyregisterer.js
  {
    registerKeyPress(buttonMove.hold, 38, function(){thetaX-=0.02;});
    registerKeyPress(buttonMove.hold, 40, function(){thetaX+=0.02;});
    registerKeyPress(buttonMove.hold, 37, function(){thetaY-=0.02;});
    registerKeyPress(buttonMove.hold, 39, function(){thetaY+=0.02;});
  
    registerKeyPress(buttonMove.hold, 83, function(){worldShift[0]+=move[0];worldShift[2]-=move[1];});
    registerKeyPress(buttonMove.hold, 87, function(){worldShift[0]-=move[0];worldShift[2]+=move[1];});
    registerKeyPress(buttonMove.hold, 65, function(){worldShift[0]+=move[1];worldShift[2]+=move[0];});
    registerKeyPress(buttonMove.hold, 68, function(){worldShift[0]-=move[1];worldShift[2]-=move[0];});
    registerKeyPress(buttonMove.hold, 16, function(){worldShift[1]+=1/20;});//down
    registerKeyPress(buttonMove.hold, 32, function(){worldShift[1]-=1/20;});//up
  }


  //gl variables
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
  
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);
  }


  //begin tick cycle
  tick();
}
//}end code for drawing to screen