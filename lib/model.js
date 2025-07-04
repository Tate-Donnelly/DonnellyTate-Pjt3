/**
 * A model used in our scene, as determined from an OBJ and corresponding MTL file.
 */
class Model {
    textured = false;           // Whether this model is textured
    imagePath = null;           // The URL of the texture image, if one is used
    image=new Image();

    objParsed = false;          // Whether the object file has been parsed
    mtlParsed = false;// Whether the material file has been parsed

    startingMatrix=mat4();
    animateMatrix=mat4();
    children=[];
    faces = [];                 // The faces that make up the model (array of Face objects)
    verticesLen=0;
    texture=null;
    textureID=gl.TEXTURE0;

    canMakeShadow=false;
    materials=new Map();

    textureConfigured=false;

    ready=false;
    shiny=1.0;
    diffuseMap = new Map();     // A map of material name to corresponding diffuse color
    specularMap = new Map();    // A map of material name to corresponding specular color
    name="";
    isCar=false;
    isBunny=false;

    constructor(name,objPath, mtlPath,position=mat4(),rotation=mat4()) {
        this.ready=false;
        this.name=name;
        this.startingMatrix=mult(rotation, position);
        // Load and parse the OBJ file
        this.loadFile(objPath, this.parseObjFile.bind(this));   // Binding necessary to keep object scope (see [2])

        // Load and parse the MTL file
        this.loadFile(mtlPath, this.parseMtlFile.bind(this));   // Binding necessary to keep object scope (see [2])
    }

    readyToRender(){
        return this.objParsed && this.mtlParsed;
    }

    render(){
        this.configureTexture();
        gl.uniform1i(gl.getUniformLocation(program,"reflection"),reflect && this.isCar);
        gl.uniform1i(gl.getUniformLocation(program,"refraction"),refract && this.isBunny);
        let m=Array.from(this.materials.values());
        for(let i = 0; i < m.length; i++){
            this.drawByMaterials(m[i],shadowsVisible && lampOn);
        }
        gl.uniform1i(gl.getUniformLocation(program,"reflection"),false);
        gl.uniform1i(gl.getUniformLocation(program,"refraction"),false);
    }

    /*Updates the material*/
    updateMaterials(material){
        gl.uniform4fv(gl.getUniformLocation(program, "materialSpecular"), flatten(this.specularMap.get(material.material)));
        gl.uniform4fv(gl.getUniformLocation(program, "materialDiffuse"), flatten(this.diffuseMap.get(material.material)));
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), this.shiny);
    }

    /*Draws the object that corresponds to the given material*/
    drawByMaterials(material,shadows){
        this.updateMaterials(material);

        createBuffer(4,'vPosition',material.faceVertices);
        createBuffer(4,'vNormal',material.faceNormals);
        createBuffer(2,'vTexCoord',material.faceTexCoords);
        gl.drawArrays( gl.TRIANGLES, 0, material.faceVertices.length );
        if(this.canMakeShadow && shadows) this.makeShadows(material,shadows);
    }

    /*Makes the object's shadow projections*/
    makeShadows(material){
        let origin=translate(lightPosition[0],lightPosition[1],lightPosition[2]);

        let shadows=mat4();
        shadows[3][1]=-1/lightPosition[1];
        shadows[3][3]=0;

        let pos=translate(-lightPosition[0],-lightPosition[1],-lightPosition[2]);

        let transformation=mult(mult(origin,shadows),pos);
        let shadowMatrix=mult(transformation,modelMatrix);

        gl.uniform1i(gl.getUniformLocation(program,"shadowsVisible"),true);
        gl.uniformMatrix4fv(gl.getUniformLocation(program,"shadowMatrix"), false, flatten(shadowMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, material.faceVertices.length);
        gl.uniform1i(gl.getUniformLocation(program,"shadowsVisible"),false);
    }

    /*Loads all the object's materials */
    loadMaterials(){
        for(let i=0;i<this.faces.length;i++){
            if(this.materials.has(this.faces[i].material)){
                let m=this.materials.get(this.faces[i].material);
                m.loadArrays(this.faces[i]);
                this.materials.set(this.faces[i].material,m);
            }else{
                this.materials.set(this.faces[i].material,new Material(this.faces[i].material,this.faces[i]));
            }
        }

        console.log(this.materials.values());
        this.ready=this.materials.values()!==null || this.imagePath !== "";
        if(!this.ready) this.loadMaterials();
    }

    /*Configures the model's texture*/
    configureTexture() {
        if(!this.textured || this.textureConfigured) return;
        // Create and bind texture object
        this.texture = gl.createTexture();
        gl.activeTexture(this.textureID);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Set behavior for s-t texture coordinates outside the 0.0-1.0 range
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Specify the array of the two-dimensional texture elements
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.image);

        // Specify point-sampling behavior
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Link the texture object we create in the application to the sampler in the fragment shader
        gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
        this.textureConfigured=true;
    }

    /*Returns the car's position based on the given speed and it's animationMatrix*/
    getModelMatrix(animate,speed){
        if(animate && this.isCar) this.animateMatrix=mult(rotateY(speed),this.animateMatrix);
        return this.animateMatrix;
    }

    /**
     * Splits a text file into individual lines and filters out blank lines.
     *
     * @param file      The text file to process.
     * @returns {*}     An array of lines from the text file.
     */
    splitAndSanitizeFile(file) {
        let lines = file.split('\n');
        lines = lines.filter(line => {
            return (line.search(/\S/) !== -1);
        });
        lines = lines.map(line => {
            return line.trim();
        });
        return lines;
    }

    /**
     * Load the file into the program and start the parsing process
     *
     * @param path          The URL of the file being loaded.
     * @param parseFile     The parsing function to use with this file.
     */
    loadFile(path, parseFile) {

        // Asynchronously load file
        let req = new XMLHttpRequest(); // See [1]
        req.overrideMimeType( "text/plain; charset=x-user-defined" );   // Ensure correct MIME type (see [3])
        req.open('GET', path);
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                let file = req.responseText;

                //console.log(path);

                // Parse the file
                parseFile(file);
            }
        }
        req.send(null);
    }


    /**
     * Parsing function for the material (MTL) file.
     *
     * @param mtlFile   The MTL file to parse
     */
    parseMtlFile(mtlFile) {
        // Split and sanitize MTL file input
        let mtlLines = this.splitAndSanitizeFile(mtlFile);

        // Create mapping of material name to diffuse / specular colors
        this.diffuseMap = new Map();
        this.specularMap = new Map();
        let currMaterial = null;

        for (let currLine = 0; currLine < mtlLines.length; currLine++) {
            let line = mtlLines[currLine];

            if (line.startsWith("newmtl")) {        // Hit a new material
                currMaterial = line.substring(line.indexOf(' ') + 1);   // See [4]
            }
            else if (line.startsWith("Ns")) {       // Sets the shiniess of the model
                this.shiny= parseFloat(line.substr(line.indexOf(' ') + 1));
            }
            else if (line.startsWith("Kd")) {       // Material diffuse definition
                let values = line.match(/[+-]?([0-9]+[.])?[0-9]+/g);
                this.diffuseMap.set(currMaterial, [parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]), 1.0]);
            }
            else if (line.startsWith("Ks")) {       // Material specular definition
                let values = line.match(/[+-]?([0-9]+[.])?[0-9]+/g);
                this.specularMap.set(currMaterial, [parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]), 1.0]);
            }
            else if (line.startsWith("map_Kd")) {   // Texture file

                // Get the path of the texture file
                // Note that any model will have at most one texture file
                this.imagePath = "https://web.cs.wpi.edu/~jmcuneo/cs4731/project3/" + line.substring(line.indexOf(' ') + 1);
                //console.log("Image",this.imagePath);
                this.image.src=this.imagePath;
                this.image.crossOrigin = "anonymous";

                // Set textured flag
                this.textured = true;
            }
        }

        this.mtlParsed = true;

        this.loadMaterials();
        //console.log(this.name,"Diffuse map:",this.diffuseMap,"Specular map:",this.specularMap);
    }

    /**
     * Parsing function for the object (OBJ) file.
     *
     * @param objFile   The OBJ file to parse
     */
    parseObjFile(objFile) {
        // Split and sanitize OBJ file input
        let objLines = this.splitAndSanitizeFile(objFile);

        let vertices = [];          // List of vertex definitions from OBJ
        let normals = [];           // List of normal definitions from OBJ
        let uvs = [];               // List of UV definitions (texture coordinates) from OBJ
        let currMaterial = null;    // Current material in use

        for (let currLine = 0; currLine < objLines.length; currLine++) {
            let line = objLines[currLine];

            if (line.startsWith("vn")) {            // Vertex normal definition
                let coords = line.match(/[+-]?([0-9]+[.])?[0-9]+/g);
                normals.push(vec4(coords[0], coords[1], coords[2], 0.0));
            }
            else if (line.startsWith("vt")) {       // Vertex UV definition (texture coordinate)
                let coords = line.match(/[+-]?([0-9]+[.])?[0-9]+/g);
                uvs.push(vec2(coords[0], 1.0 - coords[1]))
            }
            else if (line.charAt(0) === 'v') {      // Vertex position definition
                let coords = line.match(/[+-]?([0-9]+[.])?[0-9]+/g);
                vertices.push(vec4(coords[0], coords[1], coords[2], 1.0));
            }
            else if (line.startsWith("usemtl")) {   // Material use definition
                currMaterial = line.substring(line.indexOf(' ') + 1);
            }
            else if (line.charAt(0) === 'f') {      // Face definition
                this.processFace(line, vertices, normals, uvs, currMaterial);
                this.verticesLen+=vertices.length;
            }
        }

        this.objParsed = true;

        //console.log(this.name,"Faces:",this.faces);
    }


    /**
     * Calculates a Face object from a face line.
     *
     * @param line          The face line from our OBJ file.
     * @param vertices      The vertices from our OBJ file.
     * @param normals       The normals from our OBJ file.
     * @param uvs           The texture coordinates from our OBJ file.
     * @param currMaterial  The material used for this face.
     */
    processFace(line, vertices, normals, uvs, currMaterial) {
        // Extract the v/vt/vn statements into an array
        let indices = line.match(/[0-9\/]+/g);

        let faceVerts = [];     // Indices into vertices array for this face
        let faceNorms = [];     // Indices into normal array for this face
        let faceTexs = [];      // Indices into UVs array for this face

        // We have to account for how vt/vn can be omitted
        let types = indices[0].match(/[\/]/g).length;
        if (types === 0) {          // Only v provided
            indices.forEach(value => {
                faceVerts.push(vertices[parseInt(value) - 1]);
            });
        }
        else if (types === 1) {     // v and vt provided
            indices.forEach(value => {
                let firstSlashIndex = value.indexOf('/');

                // Vertex coordinates
                faceVerts.push(this.getVertex(value, 0, firstSlashIndex, vertices));

                // Texture coordinates
                faceTexs.push(this.getVertex(value, firstSlashIndex + 1, -1, uvs));
            });
        }
        else if (types === 2) {     // v, maybe vt, and vn provided

            indices.forEach(value => {
                let firstSlashIndex = value.indexOf('/');
                let secondSlashIndex = value.indexOf('/', firstSlashIndex + 1);

                // Vertex coordinates
                faceVerts.push(this.getVertex(value, 0, firstSlashIndex, vertices));

                // Texture coordinates, if provided
                if(secondSlashIndex > (firstSlashIndex + 1))
                {
                    faceTexs.push(this.getVertex(value, firstSlashIndex + 1, secondSlashIndex, uvs));
                }

                // Normal coordinates
                faceNorms.push(this.getVertex(value, secondSlashIndex + 1, -1, normals));
            });

        }

        // Create a new face and add it to our list of faces
        let face = new Face(faceVerts, faceNorms, faceTexs, currMaterial);
        this.faces.push(face);
    }

    /**
     * Transforms an index in a face specification into a vertex
     * from a specified array.
     *
     * @param value         The face specification (format "v/vt/vn")
     * @param start         The starting index for parsing the value
     * @param end           The ending index for parsing the value.
     *      Parses to the end of the string if the value is < 0.
     * @param vertArray     The array from which we're getting the vertex at the parsed index.
     * @returns {*}         The vertex extracted from vertArray.
     */
    getVertex(value, start, end, vertArray) {
        let objIndex;
        if(end >= 0) {
            objIndex = value.substring(start, end);
        }
        else {
            objIndex = value.substring(start);
        }
        let index = parseInt(objIndex) - 1;
        return vertArray[index];
    }
}




/*
 * ==============================
 * Some useful references
 * ==============================
 *
 * Here are some links that can give you more insight into some
 * things going on in this code. If you find other useful references,
 * let me know, and I'll add them here.
 *
 * [1] XMLHttpRequest
 * https://javascript.info/xmlhttprequest
 *
 * [2] Why this gets undefined in high order functions in Javascript? - EliuX Overflow!
 * https://eliux.github.io/javascript/common-errors/why-this-gets-undefined-inside-methods-in-javascript/
 *
 * [3] jquery - XML Parsing Error: not well-formed in FireFox but good in Chrome - Stack Overflow
 * https://stackoverflow.com/questions/7642202/xml-parsing-error-not-well-formed-in-firefox-but-good-in-chrome
 *
 * [4] String.prototype.substring() - JavaScript | MDN
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
 *
 */