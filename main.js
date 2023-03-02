/**
 * Extra Credit
 * - Press A to switch the direction of your camera rotation
 * - Press B to reset all object and stop animations
 * - Applies the shininess in the objects' obj file
 * - The lamp's shadow and bunny's shadow work
 * - Added an extra car and stop sign (Cars are stopped at the same time)
 * - Press I to increase the car's speed
 * - Press O to decrease the car's speed (Won't stop the car)
 * - Press P to reverse the direction the car is traveling in
 * **/


let gl, program,canvas;
var objectArray = [];
let objectsReady=false;
let lampOn=true, shadowsVisible=true,skyboxOn=false;
let moveCar=false, moveCamera=false,moveWithCar=false;
let reflect=false,refract=false;
let lamp, car, car2, stopSign, stopSign2, street, bunny, skybox;
let diffuse=.7;
let specular=.8;
let lightPosition =vec4(-2, 5, 1.25,1);
let lightAmbient = vec4(0.2, 0.2, 0.2, .2);
let lightDiffuse = vec4(diffuse, diffuse, diffuse, 1.0);
let lightSpecular = vec4(specular,specular,specular, 1.0);

let startingMatrix, animateMatrix, projMatrix,cameraMatrix, modelMatrix;
let cameraMatrixLoc, modelMatrixLoc;
let startingMatrixStack=[],animateMatrixStack=[];

let cameraPosition= vec3(0,4.5,4.5), cameraTarget = vec3(0, 0, 0.0);
let cameraCounterClockwise=true, cameraRotation=0;
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
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);
    gl.uniform1i(gl.getUniformLocation(program,"reflection"),reflect);
    gl.uniform1i(gl.getUniformLocation(program,"refraction"),refract);
    //gl.uniform1i(gl.getUniformLocation(program,"skybox"),skyboxOn);

    skybox=new Skybox();
    loadObjectArray();
    projectionMatrix();
    modelViewMatrix();
    defaultLighting();
    renderSetup();
}

function render(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if(moveCamera || moveWithCar) {
        if(moveCamera) cameraRotation+=cameraCounterClockwise ? 1.0:-1.0;
        setCameraMatrix();
    }

    hierarchy(street);
    if(skyboxOn) skybox.render();
    requestAnimFrame(render);
}

//Handles hierarchical transformations
function hierarchy(object) {
    if(!object.ready) return;
    object.configureTexture();

    startingMatrixStack.push(startingMatrix);
    animateMatrixStack.push(animateMatrix);
    startingMatrix = mult(startingMatrix,object.startingMatrix);
    animateMatrix = mult(object.getModelMatrix(moveCar,speed), animateMatrix);

        renderHierarchy(object);

    startingMatrix = startingMatrixStack.pop();
    animateMatrix = animateMatrixStack.pop();
}

function renderHierarchy(object){
    if(object.isCar) {
        car.carCamPosition=mult(animateMatrix,startingMatrix);
        setCameraMatrix();
    }
    modelMatrix=mult(animateMatrix,startingMatrix);
    gl.uniformMatrix4fv( modelMatrixLoc, false, flatten(modelMatrix) );
    object.render(shadowsVisible && lampOn);

    for(let i = 0; i < object.children.length; i++) {
        hierarchy(object.children[i]);
    }
}

/*Checks to make sure all objects have been parsed*/
function checkObjects(){
    if(objectArray.length>=4){
        let result=true;
        objectArray.forEach(object=>{
            result=result && object.mtlParsed && object.objParsed && object.ready;
            if(object.lightPosition===null) object.lightPosition=lightPosition;
        })
        if(result) render();
        else requestAnimFrame(checkObjects);
    }else requestAnimFrame(checkObjects);
}


window.addEventListener("keypress",(event)=>{
    keypressInput(event);
});
let speed=1;
/*Handles Keyboard Input*/
function keypressInput(event){
    switch (event.key){
        case 'i':
            if(speed>0 && ((speed+1)!==0))  speed++;
            else if(speed<0 && ((speed-1)!==0)) speed--;
            break;
        case 'o':
            if(speed>0 && ((speed-1)!==0))  speed--;
            else if(speed<0 && ((speed+1)!==0)) if((speed+1)!==0) speed++;
            break;
        case 'p':
            speed=-speed;
            break;
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
            setCameraMatrix();
            break;
        case 's':
            /*toggles shadows on and off*/
            shadowsVisible=!shadowsVisible;
            break;
        case 'e':
            /*toggles the skybox on and off*/
            skyboxOn=!skyboxOn;
            //gl.uniform1i(gl.getUniformLocation(program,"skybox"),skyboxOn);
            break;
        case 'r':
            /*toggles reflections*/
            reflect=!reflect;
            break;
        case 'f':
            /*makes the hood ornament semitransparent and begin to refract the cube map*/
            refract=!refract;
            gl.uniform1i(gl.getUniformLocation(program,"refraction"),refract);
            break;
    }
}

//Loads in and sets up the objects
function loadObjects(){
    // Get the lamp
    lamp = new Model("lamp","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj",
        "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl", translate(0,0,0));
    objectArray.push(lamp);
    lamp.canMakeShadow=true;
    // Get the car
    car = new Model("car","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl",translate(-3,0,0),rotateY(-180));
    objectArray.push(car);
    car.isCar=true;
    car.canMakeShadow=true;


    // Get the stop sign
    stopSign = new Model("stopSign","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl",translate(-0.85,0,-4.0),rotateY(-90));
    objectArray.push(stopSign);
    stopSign.canMakeShadow=true;

    /*car2 = new Model("car2","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl",translate(-3,0,0),rotateY(0));
    objectArray.push(car2);
    car2.isCar=true;
    car2.canMakeShadow=true;

    // Get the stop sign
    stopSign2 = new Model("stopSign","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl",translate(-0.85,0,-4.0),rotateY(90));
    objectArray.push(stopSign2);
    stopSign2.canMakeShadow=true;*/

    // Get the street
//    street = new Model("street",gl,"https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl",translate(0,0,0));
    street = new Model("street","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl",translate(0,0,0));

    objectArray.push(street);
    // Get the bunny
    bunny = new Model("bunny","https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl",translate(0,.75,1.5));
    objectArray.push(bunny);
    bunny.canMakeShadow=true;
    bunny.isBunny=true;
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
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), flatten(lightSpecular));

    gl.uniform4fv(gl.getUniformLocation(program, "materialAmbient"), flatten(vec4( 1.0, 1.0, 1.0, 1.0 )));
    gl.uniform4fv(gl.getUniformLocation(program, "materialDiffuse"), flatten(vec4( 1.0, 1.0, 1.0, 1.0 )));
    gl.uniform4fv(gl.getUniformLocation(program, "materialSpecular"), flatten(vec4( 1.0, 1.0, 1.0, 1.0 )));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 10.0);


    gl.uniform1i(gl.getUniformLocation(program, "lampOn"), lampOn);
}


//Makes sure the objects have been parsed before rendering
function renderSetup(){
    if(objectsReady) render();
    else checkObjects();
}

/*Sets all the objects' children and parent*/
function loadObjectArray(){
    skybox=new Skybox(0);
    loadObjects();
    car.addChild(bunny);
    street.addChild(car);
    //street.addChild(car2);
    street.addChild(stopSign);
    //street.addChild(stopSign2);
    street.addChild(lamp);
}

function projectionMatrix(){
    projMatrix=perspective(60,canvas.width/canvas.height,.1,100);
    gl.uniformMatrix4fv(gl.getUniformLocation( program, "projectionMatrix" ), false, flatten(projMatrix) );
}

/*Sets the initial modelViewMatrix*/
function modelViewMatrix(){
    setCameraMatrix();
    modelMatrix=mat4();
    startingMatrix=mat4();
    animateMatrix=mat4();

    //Model
    modelMatrixLoc=gl.getUniformLocation( program, "modelMatrix" );
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix ) );

    //View
    cameraMatrixLoc=gl.getUniformLocation( program, "cameraMatrix" );
    cameraMatrix = lookAt(cameraPosition, cameraTarget , vec3(0.0, 1.0, 0.0));
    gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(cameraMatrix) );
}

/*Sets the camera's position matrix and handles its transformations*/
function setCameraMatrix(){
    let bob,pos,target;
    let view;
    if(moveWithCar){
        //Sets the camera's position if it's from the car's POV
        pos=vec4(...mult(car.carCamPosition,vec4(0,1,1)));
        target=vec4(...mult(car.carCamPosition,vec4(0,.75,1.7)));
        view = lookAt([pos[0],pos[1],pos[2]], vec3(target[0],target[1],target[2]), vec3(0.0, 1.0, 0.0));
        gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(view) );
    }else {
        // Spins the camera in a circle while bobbing
        bob = scale(Math.sin(cameraRotation / 25), vec4(0.0, .2500, 0.0, 0.0));
        pos = add(mult(rotateY(cameraRotation), vec4(...cameraPosition)), bob);
        target = mult(rotateY(cameraRotation), vec4(...cameraTarget));
        view = lookAt([pos[0], pos[1], pos[2]], [target[0], target[1], target[2]], vec3(0.0, 1.0, 0.0));
        gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(view) );
    }
}