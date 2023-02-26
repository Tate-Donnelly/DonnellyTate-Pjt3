/**
 * Note:
 * - Occasionally, objects aren't all drawn at once. Just refresh the page
 * Extra Credit
 * - Press A to switch the direction of your camera rotation
 * - Press B to reset all object and stop animations
 * **/
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
let lightAmbient = vec4(0.2, 0.2, 0.2, .2);
let lightDiffuse = vec4(diffuse, diffuse, diffuse, 1.0);
let lightSpecular = vec4(specular,specular,specular, 1.0);
let shinyLoc;

let lightAmbientLoc, lightPositionLoc, lightSpecularLoc, lightDiffuseLoc;
let materialSpecularLoc,materialDiffuseLoc,materialAmbientLoc, lampLoc;
let shadowMatrix=mat4();


var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 10.0;

let startingMatrix, animateMatrix, projMatrix,cameraMatrix, modelMatrix;
let projectionMatrixLoc, cameraMatrixLoc, modelMatrixLoc;
let startingMatrixStack=[],animateMatrixStack=[];
let startingMatrixLoc, animateMatrixLoc,textureLoc;
let carCamPosition=vec3(0,4.5,7.5);
let carCamTarget = vec3(0, 0, 0.0);
let cameraPosition= vec3(0,4.5,7.5);
let cameraTarget = vec3(0, 0, 0.0);
let cameraUp = vec3(0.0, 1.0, 0.0);
let cameraCounterClockwise=true;

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
    textureLoc=gl.getUniformLocation(program, "texture");

    loadObjectArray();
    projectionMatrix();
    modelViewMatrix();
    defaultLighting();
    renderSetup();
}



function setCameraMatrix(){
    let bob,pos,target;
    let view;
    if(moveWithCar){
        pos=vec3(carCamPosition.x,carCamPosition.y,carCamPosition.z);
        target=vec3(carCamTarget.x,carCamTarget.y,carCamTarget.z);
        view = lookAt(pos, target, cameraUp);
        gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(view) );
    }else {
        bob = scale(Math.sin(cameraRotation / 25), vec4(0.0, .2500, 0.0, 0.0));

        pos = add(mult(rotateY(cameraRotation), vec4(...cameraPosition)), bob);
        //pos = mult(rotateY(cameraRotation), vec4(...cameraPosition));
        target = mult(rotateY(cameraRotation), vec4(...cameraTarget));

        view = lookAt([pos[0], pos[1], pos[2]], [target[0], target[1], target[2]], cameraUp);
        gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(view) );
    }
}


function render(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if(moveCamera || moveWithCar) {
        if(moveCamera) cameraRotation+=cameraCounterClockwise ? 1.0:-1.0;
        setCameraMatrix();
    }

    hierarchy(street);
    requestAnimFrame(render);
}


/*Checks to make sure all objects have been parsed*/
function checkObjects(){
    let result=true;
    //objectsReady=false;
    objectArray.forEach(object=>{
        result=result && object.mtlParsed && object.objParsed && object.ready;
        console.log(object.name,result,object.mtlParsed,object.objParsed,object.ready);
        //if(!result) requestAnimFrame(checkObjects);
    })
    console.log("Objects are ready",result);
    //objectsReady=result;
    if(result) render();
    else requestAnimFrame(checkObjects);
}

//Handles hierarchical transformations
function hierarchy(object) {
    object.configureTexture();

    startingMatrixStack.push(startingMatrix);
    animateMatrixStack.push(animateMatrix);
    startingMatrix = mult(startingMatrix,object.startingMatrix);
    animateMatrix = mult(object.getModelMatrix(moveCar), animateMatrix);
    if(object.isCar) {
        carCamPosition=mult(mult(startingMatrix,bunny.position),mult(object.getModelMatrix(moveCar), animateMatrix));
        carCamTarget=cameraTarget;
        setCameraMatrix();
    }
    modelMatrix=mult(animateMatrix,startingMatrix);
    gl.uniformMatrix4fv( modelMatrixLoc, false, flatten(modelMatrix) );
    object.render();

    for(let i = 0; i < object.children.length; i++) {
        hierarchy(object.children[i]);
    }
    startingMatrix = startingMatrixStack.pop();
    animateMatrix = animateMatrixStack.pop();
}

function makeShadows(material){
    if(!shadowsVisible || !lampOn) return;
    createBuffer(4,'vNormal',material.faceNormals);
    createBuffer(2,'vTexCoord',material.faceTexCoords);
    let origin=translate(lightPosition[0],lightPosition[1],lightPosition[2]);

    let shadows=mat4();
    shadows[3][1]=-1/lightPosition[1];
    shadows[3][3]=0;

    let pos=translate(-lightPosition[0],-lightPosition[1],-lightPosition[2]);

    let transformation=mult(mult(origin,shadows),pos);
    shadowMatrix=mult(transformation,modelMatrix);

    gl.uniform1i(gl.getUniformLocation(program,"shadowsVisible"),true);
    gl.uniformMatrix4fv(gl.getUniformLocation(program,"shadowMatrix"), false, flatten(shadowMatrix));
    gl.drawArrays(gl.TRIANGLES, 0, material.faceVertices.length);
    gl.uniform1i(gl.getUniformLocation(program,"shadowsVisible"),false);
}

//Draws an item by material instead of by face
function drawByMaterial(object,index, material)
{
    materialDiffuse=object.diffuseMap.get(material.material);
    materialSpecular=object.specularMap.get(material.material);
    gl.uniform1f(shinyLoc, object.shiny);
    lighting();
    //makeShadows(object.canMakeShadow,material.faceVertices.length);

    createBuffer(4,'vPosition',material.faceVertices);
    createBuffer(4,'vNormal',material.faceNormals);
    createBuffer(2,'vTexCoord',material.faceTexCoords);
    gl.drawArrays( gl.TRIANGLES, 0, material.faceVertices.length );
}

function lighting(){
    gl.uniform4fv(lightSpecularLoc, flatten(lightSpecular));
    gl.uniform4fv(lightDiffuseLoc, flatten(lightDiffuse));
    gl.uniform4fv(materialSpecularLoc, flatten(materialSpecular));
    gl.uniform4fv(materialDiffuseLoc, flatten(materialDiffuse));
    gl.uniform1f(shinyLoc, materialShininess);
}

window.addEventListener("keypress",(event)=>{
    keypressInput(event);
});

/*Handles Keyboard Input*/
function keypressInput(event){
    switch (event.key){
        case 'a':
            cameraCounterClockwise=!cameraCounterClockwise;
            break;
        case 'b':
            lampOn=true;
            moveCamera=false;
            moveCar=false;
            cameraPosition= vec3(0,4.5,4.5);
            cameraTarget = vec3(0, 0, 0.0);
            cameraRotation=0;
            car.animateMatrix=mat4();
            cameraCounterClockwise=true;
            setCameraMatrix();
            break;
        case 'l':
            /*Toggle light on and off. Make sure that ambient light is applied when off*/
            lampOn=!lampOn;
            gl.uniform1i(lampLoc, lampOn);
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
            setCameraMatrix();
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

//Loads in and sets up the objects
function loadObjects(){
    // Get the lamp
    lamp = new Model("lamp",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl", translate(0,0,0));
    objectArray.push(lamp);
    //lamp.canMakeShadow=true;
    // Get the car
    car = new Model("car",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl",translate(-3,0,0),rotateY(-180));
    objectArray.push(car);
    car.isCar=true;
    car.canMakeShadow=true;
    // Get the stop sign
    stopSign = new Model("stopSign",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl",translate(-0.85,0,-4.0),rotateY(-90));
    objectArray.push(stopSign);
    stopSign.canMakeShadow=true;
    // Get the street
    street = new Model("street",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl",translate(0,0,0));
    objectArray.push(street);
    // Get the bunny
    bunny = new Model("bunny",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl",translate(0,.75,1.5));
    objectArray.push(bunny);
    // bunny.canMakeShadow=true;
}

//Creates a buffer
function createBuffer(size,attribute, array){
    var buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(array), gl.STATIC_DRAW );

    var attributeLoc =gl.getAttribLocation( program, attribute );
    gl.vertexAttribPointer( attributeLoc, size, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( attributeLoc );
}

//Sets up the default lighting
function defaultLighting(){
    shinyLoc=gl.getUniformLocation(program, "shininess");
    lightAmbientLoc=gl.getUniformLocation(program, "lightAmbient");
    lightPositionLoc=gl.getUniformLocation(program, "lightPosition");
    materialAmbientLoc=gl.getUniformLocation(program, "materialAmbient");
    lampLoc=gl.getUniformLocation(program, "lampOn");

    lightSpecularLoc=gl.getUniformLocation(program, "lightSpecular");
    lightDiffuseLoc=gl.getUniformLocation(program, "lightDiffuse");
    materialSpecularLoc=gl.getUniformLocation(program, "materialSpecular");
    materialDiffuseLoc=gl.getUniformLocation(program, "materialDiffuse");


    gl.uniform4fv(lightSpecularLoc, flatten(lightSpecular));
    gl.uniform4fv(lightDiffuseLoc, flatten(lightDiffuse));
    gl.uniform4fv(materialSpecularLoc, flatten(materialSpecular));
    gl.uniform4fv(materialDiffuseLoc, flatten(materialDiffuse));
    gl.uniform4fv(lightAmbientLoc, flatten(lightAmbient));
    gl.uniform4fv(materialAmbientLoc, flatten(materialAmbient));
    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
    gl.uniform1f(shinyLoc, materialShininess);
    gl.uniform1i(lampLoc, lampOn);
    lighting();
}


//Makes sure the objects have been parsed before rendering
function renderSetup(){
    if(objectsReady) render();
    else checkObjects();
}

function loadObjectArray(){
    loadObjects();
    street.addChild(car);
    street.addChild(stopSign);
    street.addChild(lamp);
    car.addChild(bunny);
}

function projectionMatrix(){
    projMatrix=perspective(fov,canvas.width/canvas.height,near,far);
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projMatrix) );
}
function modelViewMatrix(){
    setCameraMatrix();

    startingMatrix=mat4();
    animateMatrix=mat4();
    modelMatrix=mat4();

    //Model
    modelMatrixLoc=gl.getUniformLocation( program, "modelMatrix" );
    startingMatrixLoc=gl.getUniformLocation( program, "startingMatrix" );
    animateMatrixLoc=gl.getUniformLocation( program, "animateMatrix" );
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix ) );
    gl.uniformMatrix4fv(startingMatrixLoc, false, flatten(startingMatrix) );
    gl.uniformMatrix4fv(animateMatrixLoc, false, flatten(animateMatrix) );

    //View
    cameraMatrixLoc=gl.getUniformLocation( program, "cameraMatrix" );
    cameraMatrix = lookAt(cameraPosition, cameraTarget , cameraUp);
    gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(cameraMatrix) );
}