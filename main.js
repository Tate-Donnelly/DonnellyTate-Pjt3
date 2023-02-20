let gl, program,canvas;
var objectArray = [];
let objectsReady=false;
let lampOn=true, shadowsVisible=true,skyboxOn=true;
let moveCar=false;
let moveCamera=false,moveWithCar=false;
let reflectionsOn=true;
let lamp, car, stopSign, street, bunny;
let diffuse=.7;
let specular=.8;
let lightPosition =vec4(-2, 5, 1.25,1);
let lightAmbient = vec4(0.2, 0.2, 0.2, 1);
let lightDiffuse = vec4(diffuse, diffuse, diffuse, 1.0);
let lightSpecular = vec4(specular,specular,specular, 1.0);

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 10.0;

let modelMatrix, projMatrix,cameraMatrix;
let modelMatrixLoc, projectionMatrixLoc, cameraMatrixLoc;
let translateMatrix, rotationMatrix, scaleMatrix;
let cameraPosition= vec3(0,4.5,4.5);
let cameraTarget = vec3(0, 0, 0.0);
let cameraUp = vec3(0.0, 1.0, 0.0);

let cameraRotation=0;

let near = .1;
let far = 100;
let fov=60;


function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);

    //Check that the return value is not null.
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Initialize shaders
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    loadObjectArray();
    translateMatrix=mat4();
    rotationMatrix=mat4();
    scaleMatrix=mat4();
    projectionMatrix();
    modelViewMatrix();
    cameraMatrixLoc=gl.getUniformLocation( program, "cameraMatrix" );
    cameraMatrix = lookAt(cameraPosition, cameraTarget , cameraUp);
    gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(cameraMatrix) );
    defaultLighting();
    render();
}

function loadObjectArray(){
    loadObjects();
    objectArray.push(street);
    objectArray.push(car);
    objectArray.push(stopSign);
    objectArray.push(lamp);
    car.addChild(bunny);
    //objectArray.push(bunny);
    checkObjects();
}

function projectionMatrix(){
    projMatrix=perspective(fov,canvas.width/canvas.height,near,far);
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projMatrix) );
}
function modelViewMatrix(){
    setCameraMatrix();

    modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
    modelMatrix = mult(mult(rotationMatrix,translateMatrix),scaleMatrix);
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix) );
}

function setCameraMatrix(){
    let bob,pos,target;

    bob=scale(Math.sin(cameraRotation / 25), vec4(0.0, .2500, 0.0, 0.0));

    //pos=add(mult(rotateY(cameraRotation),vec4(...cameraPosition)),bob);
    pos=mult(rotateY(cameraRotation),vec4(...cameraPosition));
    target=mult(rotateY(cameraRotation),vec4(...cameraTarget));

    let view = lookAt([pos[0],pos[1],pos[2]], [target[0],target[1],target[2]] , cameraUp);

    gl.uniformMatrix4fv(gl.getUniformLocation( program, "cameraMatrix" ), false, flatten(view) );
}

function render(){
    if(objectsReady) {
        draw();
    }
    else {
        checkObjects();
        requestAnimFrame(render);
    }
}

function draw(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if(moveCamera) {
        cameraRotation+=1.0;
        setCameraMatrix();
    }

    drawAllObjects();
    requestAnimFrame(draw);
}



function checkObjects(){
    for (let i = 0; i < objectArray.length; i++){
        if(!objectArray[i].mtlParsed || !objectArray[i].objParsed){
            objectsReady=false;
            return;
        }
    }
    objectsReady=true;
}

function drawAllObjects(){
    for (let i = 0; i < objectArray.length; i++){
        for (let j = 0; j < objectArray[i].faces.length; j++){
            drawFace(objectArray[i],objectArray[i].faces[j]);
        }
    }
}

function drawFace(object,face){
    configureTexture(object);

    createBuffer(4,'vPosition',face.faceVertices);
    createBuffer(4,'vNormal',face.faceNormals);
    createBuffer(2,'vTexCoord',face.faceTexCoords);

    modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
    modelMatrix = mult(rotateY(object.rotation),translate(object.position));
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix) );

    materialDiffuse=object.diffuseMap.get(face.material);
    materialSpecular=object.specularMap.get(face.material);
    gl.uniform4fv(gl.getUniformLocation(program, "shininess"), flatten(object.shiny));
    lighting();

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawArrays(gl.TRIANGLE_FAN,0,face.faceVertices.length);
}

function configureTexture(object) {
    // Create and bind texture object
    object.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, object.texture);

    // Set behavior for s-t texture coordinates outside the 0.0-1.0 range
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Specify the array of the two-dimensional texture elements
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, object.image);

    // Specify point-sampling behavior
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Link the texture object we create in the application to the sampler in the fragment shader
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function lighting(){
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), flatten(lightSpecular));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "materialSpecular"), flatten(materialSpecular));
    gl.uniform4fv(gl.getUniformLocation(program, "materialDiffuse"), flatten(materialDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "shininess"), flatten(materialShininess));
}

window.addEventListener("keypress",(event)=>{
    keypressInput(event);
});

/*Handles Keyboard Input*/
function keypressInput(event){
    switch (event.key){
        case 'l':
            /*Toggle light on and off. Make sure that ambient light is applied when off*/
            lampOn=!lampOn;
            console.log(lampOn);
            gl.uniform1i(gl.getUniformLocation(program, "lampOn"), lampOn);

            break;
        case 'c':
            /*
            Make the camera move along a circle on the XZ plane
            Have it bob up and down on the Y axis
            */
            moveCamera=!moveCamera;
            break;
        case 'm':
            /*toggle moving the car around the road*/
            moveCar=!moveCar;
            break;
        case 'd':
            /*allows the camera to move and rotate in line with the car*/
            moveWithCar=!moveWithCar;
            break;
        case 's':
            /*toggles shadows on and off*/
            shadowsVisible=!shadowsVisible;
            break;
        case 'e':
            /*toggles the skybox on and off*/
            skyboxOn=!skyboxOn;
            break;
        case 'r':
            /*toggles reflections*/
            reflectionsOn=!reflectionsOn;
            break;
        case 'f':
            /*makes the hood ornament semitransparent and begin to refract the cube map*/
            break;
    }
}

function loadObjects(){
    // Get the lamp
    lamp = new Model(gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl", vec3(0.0,0.0,0.0));

    // Get the car
    car = new Model(gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl",vec3(-3,0.0,0.0),-180);

    // Get the stop sign
    stopSign = new Model(gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl",vec3(-.850,0.0,-4.00),-90);

    // Get the street
    street = new Model(gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl",vec3(0.0,0.0,0.0));

    // Get the bunny
    bunny = new Model(gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl",vec3(0.0,0.0,0.0));
}

function createBuffer(size,attribute, array){
    var buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(array), gl.STATIC_DRAW );

    var attributeLoc =gl.getAttribLocation( program, attribute );
    gl.vertexAttribPointer( attributeLoc, size, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( attributeLoc );
}

function defaultLighting(){
    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "materialAmbient"), flatten(materialAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
    gl.uniform1i(gl.getUniformLocation(program, "lampOn"), lampOn);
    lighting();
}
