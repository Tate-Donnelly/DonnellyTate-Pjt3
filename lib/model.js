/**
 * A model used in our scene, as determined from an OBJ and corresponding MTL file.
 */
class Model {

    textured = false;           // Whether this model is textured
    imagePath = null;           // The URL of the texture image, if one is used

    objParsed = false;          // Whether the object file has been parsed
    mtlParsed = false;          // Whether the material file has been parsed

    faces = [];                 // The faces that make up the model (array of Face objects)

    diffuseMap = new Map();     // A map of material name to corresponding diffuse color
    specularMap = new Map();    // A map of material name to corresponding specular color

    constructor(objPath, mtlPath) {
        // Load and parse the OBJ file
        this.loadFile(objPath, this.parseObjFile.bind(this));   // Binding necessary to keep object scope (see [2])

        // Load and parse the MTL file
        this.loadFile(mtlPath, this.parseMtlFile.bind(this));   // Binding necessary to keep object scope (see [2])
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

                // Set textured flag
                this.textured = true;
            }
        }

        this.mtlParsed = true;
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
            else if (line.startsWith("vt")) {       // Vertex UV definition
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
            }
        }
        
        this.objParsed = true;
        console.log(this.faces);

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
                faceVerts.push(vertices[parseInt(value.substring(0, value.indexOf('/'))) - 1]);
                faceTexs.push(uvs[parseInt(value.substring(value.indexOf('/') + 1)) - 1]);
            });
        }
        else if (types === 2) {     // v, maybe vt, and vn provided
            let firstSlashIndex = indices[0].indexOf('/');

            if (indices[0].charAt(firstSlashIndex + 1) === '/') {   // vt omitted
                indices.forEach(value => {
                    faceVerts.push(vertices[parseInt(value.substring(0, value.indexOf('/'))) - 1]);
                    faceNorms.push(normals[parseInt(value.substring(value.indexOf('/') + 2)) - 1]);
                });
            }
            else {                                                  // vt provided
                indices.forEach(value => {
                    let firstSlashIndex = value.indexOf('/');
                    let secondSlashIndex = value.indexOf('/', firstSlashIndex + 1);
                    faceVerts.push(vertices[parseInt(value.substring(0, firstSlashIndex)) - 1]);
                    faceTexs.push(uvs[parseInt(value.substring(firstSlashIndex + 1, secondSlashIndex)) - 1])
                    faceNorms.push(normals[parseInt(value.substring(secondSlashIndex + 1)) - 1]);
                });
            }
        }

        // Create a new face and add it to our list of faces
        let face = new Face(faceVerts, faceNorms, faceTexs, currMaterial);
        this.faces.push(face);
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