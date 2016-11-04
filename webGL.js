function init() {
	//
	// Setup
	//
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
	var boxVerticies =
	[
	//	x	 y 	  z,   r, g, b
		// Front face
		-1.0, -1.0,  1.0, 1, 0, 0,
		 1.0, -1.0,  1.0, 0, .5, .5,
		 1.0,  1.0,  1.0, 1, 0, 1,
		-1.0,  1.0,  1.0, 0, 1, 1,

		// Back face
		-1.0, -1.0, -1.0, 1, 1, 0,
		-1.0,  1.0, -1.0, 0, 1, 0,
		 1.0,  1.0, -1.0, 0, 0, 1,
		 1.0, -1.0, -1.0, .5, .5, 0,

		// Top face
		-1.0,  1.0, -1.0, 0, 1, 0,
		-1.0,  1.0,  1.0, 0, 1, 1,
		 1.0,  1.0,  1.0, 1, 0, 1,
		 1.0,  1.0, -1.0, 0, 0, 1,

		// Bottom face
		-1.0, -1.0, -1.0, 1, 1, 0,
		 1.0, -1.0, -1.0, .5, .5, 0,
		 1.0, -1.0,  1.0, 0, .5, .5,
		-1.0, -1.0,  1.0, 1, 0, 0,

		// Right face
		1.0, -1.0, -1.0, .5, .5, 0,
		1.0,  1.0, -1.0, 0, 0, 1,
		1.0,  1.0,  1.0, 1, 0, 1,
		1.0, -1.0,  1.0, 0, .5, .5,

		// Left face
		-1.0, -1.0, -1.0, 1, 1, 0,
		-1.0, -1.0,  1.0, 1, 0, 0,
		-1.0,  1.0,  1.0, 0, 1, 1,
		-1.0,  1.0, -1.0, 0, 1, 0,
	];

	var boxIndicies =
	[
		// front
		0,  1,  2,
		0,  2,  3,

		// back
		4,  5,  6,
		4,  6,  7,

		// top
		8,  9,  10,
		8,  10, 11,

		// bottom
		12, 13, 14,
		12, 14, 15,

		// right
		16, 17, 18,
		16, 18, 19,

		// left
		20, 21, 22,
		20, 22, 23
	];

	var boxVertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxVerticies), gl.STATIC_DRAW);

	var boxIndexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIndexBufferObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndicies), gl.STATIC_DRAW);

	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	var colorAttribLocation = gl.getAttribLocation(program, 'vertColor');
	
	gl.vertexAttribPointer(
		positionAttribLocation,
		3,
		gl.FLOAT,
		gl.FALSE,
		6 * Float32Array.BYTES_PER_ELEMENT,
		0
	);

	gl.vertexAttribPointer(
		colorAttribLocation,
		3,
		gl.FLOAT,
		gl.FALSE,
		6 * Float32Array.BYTES_PER_ELEMENT,
		3 * Float32Array.BYTES_PER_ELEMENT
	);

	gl.enableVertexAttribArray(positionAttribLocation);
	gl.enableVertexAttribArray(colorAttribLocation);

	// Tell WebGL which program should be active
	gl.useProgram(program);

	//
	// Transforms
	//
	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -7], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width/canvas.height, .1, 1000);

	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

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
		gl.drawElements(gl.TRIANGLES, boxIndicies.length, gl.UNSIGNED_SHORT, 0);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}