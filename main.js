let gl, program,canvas;
var objectArray = [];
var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];
var minT = 0.0;
var maxT = 1.0;
let lampOn=true, moveCamera=false,moveCar=false,moveWithCar=false,shadowsVisible=true,skyboxOn=true,reflectionsOn=true;
let lamp, car, stopSign, street, bunny;

let lightPosition = vec4(0.0, 2.5, 0.0, 0.0);
let lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4( 0.0, 1.00, 1.60, 1.0 );
var materialDiffuse = vec4( 1.0, .8, 0.0, 1.0 );
var materialSpecular = vec4( 5.0, 5.0, 5.0, 1.0 );
var materialShininess = 70.0;

let modelMatrix, projMatrix,cameraMatrix;
let modelMatrixLoc, projectionMatrixLoc, cameraMatrixLoc;
let translateMatrix, rotationMatrix, scaleMatrix;
let cameraPosition= vec3(10,7.5,3.5);
let cameraTarget = vec3(0, 0, -1.0);
let cameraUp = vec3(0.0, 1.0, 0.0);
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

    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    loadObjectArray();
    translateMatrix=mat4();
    rotationMatrix=mat4();
    scaleMatrix=mat4();
    projectionMatrix();
    modelViewMatrix();
    lighting();
    render();
}

function loadObjectArray(){
    // Get the lamp
    lamp = new Model("https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/lamp.mtl");

    // Get the car
    car = new Model("https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/car.mtl");

    // Get the stop sign
    stopSign = new Model("https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/stopsign.mtl");

    // Get the street
    street = new Model("https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/street.mtl");

    // Get the bunny
    bunny = new Model("https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.obj", "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/bunny.mtl");

    objectArray.push(stopSign);
    /*objectArray.push(lamp);
    objectArray.push(car);
    objectArray.push(street);
    objectArray.push(bunny);*/
}

function projectionMatrix(){
    projMatrix=perspective(fov,canvas.width/canvas.height,near,far);
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projMatrix) );
}
function modelViewMatrix(){
    let bob,pos,eye, target, at;
    pos=mult(rotateY(alpha),vec4(...cameraPosition));
    eye=vec3(pos[0],pos[1],pos[2]);
    cameraMatrixLoc=gl.getUniformLocation( program, "cameraMatrix" );
    cameraMatrix = lookAt(eye, cameraTarget , cameraUp);

    modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
    modelMatrix = mult(mult(translateMatrix,rotationMatrix),scaleMatrix);

    gl.uniformMatrix4fv(cameraMatrixLoc, false, flatten(cameraMatrix) );
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix) );
}

function render(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    cameraMovement();
    modelViewMatrix();
    drawAllObjects();
    lighting();
    requestAnimFrame(render);
}
let alpha=0;
function cameraMovement(){
    if(moveCamera){
        alpha+=0.5
    }
}

function drawAllObjects(){
    objectArray.forEach(object=>{
        if(!object.mtlParsed || !object.objParsed) return;
        object.faces.forEach(face=>{
            materialDiffuse=object.diffuseMap.get(face.material);
            materialSpecular=object.specularMap.get(face.material);
            drawModel(face);

            console.log(face.material,object.diffuseMap,object.specularMap);
        });
    })
}

function drawModel(face){
    console.log(face.material);
    //configureTexture(face.material);
    createBuffer(4,'vPosition',face.faceVertices);
    createBuffer(4,'vNormal',face.faceNormals);
    createBuffer(2,'vTexCoord',face.faceTexCoords);
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.enableVertexAttribArray(vTexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawArrays(gl.TRIANGLES,0,face.faceVertices.length);
}

function configureTexture(image, ind, textureLoc, fragmentLoc) {

    //Create a texture object
    let tex = gl.createTexture();
    gl.activeTexture(textureLoc);

    //Bind it as the current two-dimensional texture
    gl.bindTexture(gl.TEXTURE_2D, tex);

    //How do we interpret a value of s or t outside of the range (0.0, 1.0)?
    //Generally, we want the texture either to repeat or to clamp the values to 0.0 or 1.0
    //By executing these functions after the gl.bindTexture, the parameters become part of the texture object
    //Other option for last parameter is gl.REPEAT, but that doesn't work here
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    //Specify the array of the two-dimensional texture elements
    //target, level, iformat, format, type, image
    //target - lets us choose a single image or set up a cube map
    //level - mipmapping, where 0 denotes the highest resolution or that we are not using mipmapping
    //iformat - how to store the texture in memory
    //format and type - how the pixels are stored, so that WebGL knows how to read those pixels in
    //image - self-explanatory
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    //Link the texture object we create in the application to the sampler in the fragment shader
    gl.uniform1i(gl.getUniformLocation(program, fragmentLoc), ind);
}

function lighting(){
    let diffuseProduct = mult(lightDiffuse, materialDiffuse);
    let specularProduct = mult(lightSpecular, materialSpecular);
    let ambientProduct = mult(lightAmbient, materialAmbient);
    /*
    let diffuseProduct = lightDiffuse;
    let specularProduct = lightSpecular;
    let ambientProduct = lightAmbient;*/
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
}
function createBuffer(size,attribute, array){
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(array), gl.STATIC_DRAW );

    var attributLoc =gl.getAttribLocation( program, attribute );
    gl.vertexAttribPointer( attributLoc, size, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( attributLoc );
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
            render();
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