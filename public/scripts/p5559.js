// three objects
var container;
var camera, scene, renderer, keyLight, fillLight;
var editor_control, trans_control;
var projector, raycaster, currentIntersected;
var mouse = new THREE.Vector2();

var geo_sphere;
var mat_sphere;
var mat_highlight;
var three_halos;
var three_tree;

var geo_particle;
var mat_particle;

var particle_system;
var particle_number = 10000;

// dat.gui objects
var gui;
var guiCtlObject = {
  time : 12,
  displayHalos : false,
  displayParticles : true
};

// records
var tree_id;
var halos_time;

// galactic objects
var vert_shader = [
"attribute float size;",
"attribute vec3 customColor;",
"varying vec3 vColor;",
"varying float dist;",
"varying float pSize;",
"uniform float zoomSize;",
"uniform float scale;",
"void main() {",
"vColor = customColor;",
"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
"dist = length( mvPosition.xyz );",
"float finalSize = scale * size / length( mvPosition.xyz );",
"//gl_PointSize = clamp( scaledSize , 0., 4000.);",
"//gl_PointSize = size * ( scale / length( mvPosition.xyz ));",
"gl_PointSize = finalSize;",
"gl_Position = projectionMatrix * mvPosition;",
"pSize = finalSize;",
"}"].join("\n");

var frag_shader = [
"uniform vec3 color;",
"uniform sampler2D texture0;",
"uniform sampler2D texture1;",
"uniform float idealDepth;",
"uniform float blurPower;",
"uniform float blurDivisor;",
"uniform float sceneSize;",
"uniform float cameraDistance;",
"uniform float heatVision;",
"varying vec3 vColor;",
"varying float dist;",
"varying float pSize;",
"void main() {",
"vec4 particleColor = vec4(color*vColor, 0.8);",
"float bwColor = length(particleColor) * 0.15 * heatVision;",
"particleColor.xyz *= (1.0-heatVision);",
"particleColor.xyz += bwColor;",
"float depth = gl_FragCoord.z / gl_FragCoord.w;",
"depth = (depth / (sceneSize + cameraDistance) );",
"float focus = clamp( depth - pSize, 0., 1. );",
"vec4 color0 = texture2D(texture0, vec2(gl_PointCoord.x, gl_PointCoord.y) );",
"vec4 color1 = texture2D(texture1, gl_PointCoord );",
"vec4 diffuse = mix( color0, color1, clamp(depth,0.,1.) );",
"gl_FragColor = particleColor * diffuse;",
"}"].join("\n");

var galacticTexture0 = THREE.ImageUtils.loadTexture( "../texture/galactic_sharp.png" );
var galacticTexture1 = THREE.ImageUtils.loadTexture( "../texture/galactic_blur.png" );

var galacticUniforms = {
  color:     { type: "c", value: new THREE.Color( 0xffffff ) },
  texture0:   { type: "t", value: galacticTexture0 },
  texture1:   { type: "t", value: galacticTexture1 },
  idealDepth: { type: "f", value: 1.0 },
  blurPower: { type: "f", value: 1.0 },
  blurDivisor: { type: "f", value: 2.0 },
  sceneSize: { type: "f", value: 120.0 },
  cameraDistance: { type: "f", value: 800.0 },
  zoomSize:   { type: "f", value: 1.0 },
  scale:    { type: "f", value: 1.0 },
  heatVision: { type: "f", value: 0.0 },
};

var galacticAttributes = {
  size:       { type: 'f', value: [] },
  customColor:  { type: 'c', value: [] }
};

// three initialization
function init_three() {

  // init container
  container = document.getElementById("viewer");

  // init renderer
  renderer = new THREE.WebGLRenderer({antialias : true, alpha : true});
  renderer.setClearColor(new THREE.Color(0x000000), 1.0);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  // init camera
  camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 100000);
  camera.position.set(0, 0, 100);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // init controls
  editor_control = new THREE.EditorControls(camera, renderer.domElement);
  trans_control = new THREE.TransformControls(camera, renderer.domElement);
  trans_control.addEventListener('change', render);
  trans_control.scale = 0.8;

  // init picking tools
  projector = new THREE.Projector();
  raycaster = new THREE.Raycaster();
  raycaster.linePrecision = 0.5;

  // init scene
  scene = new THREE.Scene();

  // init particle system
  geo_particle = new THREE.Geometry();
  for (var i = 0; i < particle_number; ++i) {
    var vertex = new THREE.Vector3();
    vertex.x = 0;
    vertex.y = 0;
    vertex.z = 0;
    geo_particle.vertices.push(vertex);
    var color = new THREE.Color();
    color.setHSL(vertex.y / 200 + 0.5, 1.0, 0.5);
    geo_particle.colors.push(color);
  }
  geo_particle.computeBoundingSphere();

  // var sprite = THREE.ImageUtils.loadTexture("../texture/spark1.png");
  // mat_particle = new THREE.ParticleSystemMaterial({size: 8, vertexColors: true, map: sprite, transparent: true});
  mat_particle = new THREE.ShaderMaterial( {
    uniforms:     galacticUniforms,
    attributes:     galacticAttributes,
    vertexShader:   vert_shader,
    fragmentShader: frag_shader,

    blending:     THREE.AdditiveBlending,
    depthTest:    false,
    depthWrite:   false,
    transparent:  true,
    sizeAttenuation: true,
    opacity:    0.0
  });

  particle_system = new THREE.ParticleSystem(geo_particle, mat_particle);
  particle_system.sortParticles = true;
  scene.add(particle_system);

  geo_sphere = new THREE.SphereGeometry(1.0, 16, 8);
  mat_sphere = new THREE.MeshLambertMaterial(
      {color : 0xffff00, opacity : 0.6, transparent : true});
  mat_highlight = new THREE.MeshLambertMaterial(
      {color : 0xff0000});

  three_halos = new THREE.Object3D();
  // scene.add(three_halos);

  three_tree = new THREE.Object3D();
  // scene.add(three_tree);

  // init lights
  scene.add(new THREE.AmbientLight(0x404040));

  keyLight = new THREE.DirectionalLight(0xffffff);
  keyLight.position.set(100, 100, 100);
  scene.add(keyLight);

  fillLight = new THREE.DirectionalLight(0x858585);
  fillLight.position.set(-100, 100, 100);
  scene.add(fillLight);
}

function init_dat() {
  gui = new dat.GUI();

  gui.add(guiCtlObject, 'time', 12, 100).step(1).onFinishChange(
    function (value) {
      get_halos(value);
      get_particles(value);
    }
  );

  gui.add(guiCtlObject, 'displayHalos').onFinishChange(
    function (value) {
      if (value) {
        scene.add(three_halos);
        scene.add(three_tree);
      }
      else {
        scene.remove(three_halos);
        scene.remove(three_tree);
      }
    }
  );

  gui.add(guiCtlObject, 'displayParticles').onFinishChange(
    function (value) {
      if (value)
        scene.add(particle_system);
      else
        scene.remove(particle_system);
    }
  );
}

// p5559 initialization
function init() {
  // init_gui();
  init_three();
  init_dat();

  // load tree ids
  d3.text("../data/tree_id.csv", function(text) {
    tree_id = d3.csv.parseRows(text)[0];
  });

  // add event listener
  // renderer.domElement.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener("resize", resize, false);

  renderer.domElement.addEventListener('mousedown', onMouseDownPicking, false);
  renderer.domElement.addEventListener('mouseup', onMouseUpPicking, false);
}

function resize() {
  var width = window.innerWidth, height = window.innerHeight;
  container.style.width = width + "px";
  container.style.height = height + "px";

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function update() {
  requestAnimationFrame(update);
  trans_control.update();
  TWEEN.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

// data analysis functions
function get_halos(time) {
  d3.csv("../data/halos/hlist_" + pad(time, 3) + ".csv",
    function(d) {
      halos_time = d;
      update_halos(d, three_halos);
    }
  );
}

function get_particles(time) {
  d3.csv("../data/particles_sub/particles_" + pad(time, 3) + ".csv",
    function(d) {
      update_particles(d);
    }
  );
}

function get_trees(i) {
  d3.csv("../data/trees/tree_" + tree_id[i] + ".csv",
    function(d) {
      update_halos(d, three_tree);
    }
  );
}

function get_trees_from_rootid(id) {
  d3.csv("../data/trees/tree_" + id + ".csv",
    function(d) {
      update_halos(d, three_tree);
    }
  );
}

function update_halos(d, root) {
  // clear the halos
  var obj, i;
  for (i = root.children.length - 1; i >= 0; i--) {
    obj = root.children[i];
    root.remove(obj);
  }

  // update_tween(d[0].x, d[0].y, d[0].z);

  for (h in d) {
    var temp;
    if (root == three_halos) {
      temp = new THREE.Mesh(geo_sphere, mat_sphere);
    }
    else {
      var mat = new THREE.MeshLambertMaterial();
      mat.color.setHSL(+d[h].scale / 1.5, 1.0, 0.5);
      // console.log((+d[h].scale + 1.0) / 2.0, +d[h].scale);
      temp = new THREE.Mesh(geo_sphere, mat);
    }
    temp.position.x = d[h].x - 31.25;
    temp.position.y = d[h].y - 31.25;
    temp.position.z = d[h].z - 31.25;
    var scale = d[h].rvir / 1000;
    temp.scale.x = scale;
    temp.scale.y = scale;
    temp.scale.z = scale;
    root.add(temp);
  }
}

function update_particles(d) {
  for (i in d) {
    geo_particle.vertices[i].x = d[i].x - 31.25;
    geo_particle.vertices[i].y = d[i].y - 31.25;
    geo_particle.vertices[i].z = d[i].z - 31.25;
    geo_particle.colors[i].setHSL((+d[i].p + 2397210.) / 3010363. / 1.5, 1.0, 0.6);
  }
  geo_particle.computeBoundingSphere();

  var values_size = galacticAttributes.size.value;
  var values_color = galacticAttributes.customColor.value;

  for( var v = 0; v < geo_particle.vertices.length; v++ ) {
    values_size[ v ] = 2.5;
    values_color[ v ] = geo_particle.colors[v];
  }

  galacticUniforms.zoomSize.value = 1.0 + 10000 / camera.position.z;
  var areaOfWindow = window.innerWidth * window.innerHeight;
  galacticUniforms.scale.value = Math.sqrt(areaOfWindow) * 1.5;
}

// helper functions
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// picking functions
function onMouseDownPicking(event) {
  mouse.x = (event.layerX / container.offsetWidth) * 2 - 1;
  mouse.y = -(event.layerY / container.offsetHeight) * 2 + 1;
}

function onMouseUpPicking(event) {
  if (mouse.x === (event.layerX / container.offsetWidth) * 2 - 1
    && mouse.y === -(event.layerY / container.offsetHeight) * 2 + 1) {
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    projector.unprojectVector(vector, camera);
    raycaster.set(camera.position, vector.sub(camera.position).normalize());

    var intersects = raycaster.intersectObjects(three_halos.children, true);

    if (intersects.length > 0 && guiCtlObject.displayHalos) {
      // if (currentIntersected != undefined)
        // currentIntersected.material = mat_sphere;
      currentIntersected = intersects[0].object;
      // currentIntersected.material = mat_highlight;

      var index = three_halos.children.indexOf(currentIntersected);
      get_trees_from_rootid(halos_time[index].Tree_root_ID);
    }
  }
}

// entry of p5559
$(document).ready(function () {
  init();
  resize();
  update();
});
