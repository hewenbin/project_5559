// three variables
var container;
var camera, scene, renderer;
var editor_control, trans_control;
var projector, raycaster;
var mouse = new THREE.Vector2();

// p5559 variables
var particle_system;
var particle_number = 10000;

// three initialization
function init_three() {
  // init container
  container = document.getElementById("viewer");

  // init renderer
  renderer = new THREE.WebGLRenderer({antialias : true, alpha : true});
  renderer.setClearColor(new THREE.Color(0x000000), 0.8);
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  container.appendChild(renderer.domElement);

  // init camera
  camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 1000);
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
  var geometry = new THREE.Geometry();
  for (var i = 0; i < particle_number; ++i) {
    var vertex = new THREE.Vector3();
    vertex.x = Math.random() * 50 - 25;
    vertex.y = Math.random() * 50 - 25;
    vertex.z = Math.random() * 50 - 25;
    geometry.vertices.push(vertex);
    var color = new THREE.Color();
    color.setHSL(vertex.y / 200 + 0.5, 1.0, 0.5);
    geometry.colors.push(color);
  }
  geometry.computeBoundingSphere();

  var sprite = THREE.ImageUtils.loadTexture("../texture/snowflake7_alpha.png");
  var material = new THREE.ParticleSystemMaterial({size: 1.2, vertexColors: true, map: sprite, transparent: true});

  particle_system = new THREE.ParticleSystem(geometry, material);
  particle_system.sortParticles = true;
  scene.add(particle_system);
}

// p5559 initialization
function init() {
  // init_gui();
  init_three();

  // socket.emit("loadData", filename);

  // add event listener
  // renderer.domElement.addEventListener('mousedown', onMouseDown, false);
  window.addEventListener("resize", resize, false);
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
  render();
}

function render() {
  renderer.render(scene, camera);
}

// entry of p5559
$(document).ready(function () {
  init();
  resize();
  update();
});
