var objectName = 'teapot';

var initWebGL = function() {
	loadJSONResource('/models/' + objectName + '.json', function(modelErr, modelObject) {
		if(modelErr) {
			alert('Fatal error getting models');
			console.error(modelErr);
		}
		else {
			// TODO
			loadImage('/models/' + objectName + '.png', function(imgErr, imageObject){
				if(imgErr) {
					alert('Fatal error getting model textures');
					console.error(imgErr);
				}
				else {
					runGl(modelObject, imageObject);
				}
			});	
		}
	});
};

var runGl = function(modelObject, imageObject) {
	//
	// Setup
	//
	console.log(modelObject);

	var canvas = document.getElementById("canvas");
	var gl = canvas.getContext('webgl');

	if(!gl) {
		console.log("webgl is not supported, reverting to experimental-webgl");
		gl = canvas.getContext('experimental-webgl');
	}

	if(!gl) {
		alert("Your browser does not support WebGL");
	}

	gl.clearColor(.5, .5, .5, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);
	//
	// Shaders
	//
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, document.getElementById("vertexshader").firstChild.nodeValue);
	gl.shaderSource(fragmentShader, document.getElementById("fragmentshader").firstChild.nodeValue);

	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error("ERROR compiling vertex shader!");
		return;
	}

	gl.compileShader(fragmentShader);
	if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error("ERROR compiling fragment shader!");
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("ERROR linking program!");
		return;
	}

	// TODO remove validater on release
	gl.validateProgram(program);
	if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error("ERROR validating program!");
		return;
	}
	
	//
	// Buffers
	//
	var modelVertices = modelObject.meshes[0].vertices;
	var modelIndices = [].concat.apply([], modelObject.meshes[0].faces);
	var modelTexCoords = modelObject.meshes[0].texturecoords[0];
	var modelNormals = modelObject.meshes[0].normals;

	var modelVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);

	var modelTexCoordVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelTexCoordVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelTexCoords), gl.STATIC_DRAW);

	var modelIndexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIndexBufferObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelIndices), gl.STATIC_DRAW);

	var modelNormalsBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelNormalsBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBufferObject);
	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation,
		3,
		gl.FLOAT,
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelTexCoordVertexBufferObject);
	var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
	gl.vertexAttribPointer(
		texCoordAttribLocation,
		2,
		gl.FLOAT,
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(texCoordAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, modelNormalsBufferObject);
	var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
	gl.vertexAttribPointer(
		normalAttribLocation,
		3,
		gl.FLOAT,
		gl.TRUE,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(normalAttribLocation);
	//
	// Create texture
	//
	var objectTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, objectTexture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		imageObject
	);
	gl.bindTexture(gl.TEXTURE_2D, null);

	//
	// Transforms
	//
	gl.useProgram(program);
	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -200], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width/canvas.height, .1, 1000);

	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

	//
	// Lighting
	//
	gl.useProgram(program);
	var ambientUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
	var sunIntUniformLocation = gl.getUniformLocation(program, 'sun.direction');
	var sunDirUniformLocation = gl.getUniformLocation(program, 'sun.color');
	
	gl.uniform3f(ambientUniformLocation, 0.4, 0.4, 0.4);
	gl.uniform3f(sunDirUniformLocation, 2.0, 2.0, 2.0);
	gl.uniform3f(sunIntUniformLocation, 0.9, 0.9, 0.9);

	//
	// Main loop
	//
	var angle;
	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);

	var xRotationMatrix = new Float32Array(16);
	var yRotationMatrix = new Float32Array(16);
	
	var loop = function() {
		angle = performance.now() / 1000 / 6 * 2 * Math.PI;
		mat4.rotate(xRotationMatrix, identityMatrix, angle, [0, 1, 0]);
		mat4.rotate(yRotationMatrix, identityMatrix, angle / 4, [1, 0, 0]);
		mat4.mul(worldMatrix, xRotationMatrix, yRotationMatrix);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		gl.clearColor(0.5, 0.5, 0.5, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		gl.bindTexture(gl.TEXTURE_2D, objectTexture);
		gl.activeTexture(gl.TEXTURE0);

		gl.drawElements(gl.TRIANGLES, modelIndices.length, gl.UNSIGNED_SHORT, 0);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}