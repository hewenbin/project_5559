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
  displayParticles : true,
  displayTreeGraph : false
};

// records
var tree_id;
var halos_time;
var tree_data;

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
  heatVision: { type: "f", value: 0.0 }
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

  gui.add(guiCtlObject, 'displayTreeGraph').onFinishChange(
    function (value) {
      var viewer = document.getElementById("viewer");
      var hpviewer = document.getElementById("haloprop");
      var treeviewer = document.getElementById("treeviewer");
      if (value) {
        viewer.style.display = 'none';
        hpviewer.style.display = 'none';
        treeviewer.style.display = 'block';
      } else {
        viewer.style.display = 'block';
        hpviewer.style.display = 'block';
        treeviewer.style.display = 'none';
      }
    });
}

// d3 object
var haloprop_viewer;
var halopropdata = [{'Mass' : 0}, {'Radius' : 0}, {'Spin' : 0}, {'Velocity X' : 0}, {'Velocity Y' : 0}, {'Velocity Z' : 0}];

function update_d3() {
  // init view
  haloprop_viewer = document.getElementById("haloprop");

  // init width and height
  var hpw = haloprop_viewer.offsetWidth;
  var hph = haloprop_viewer.offsetHeight;

  d3.select('svg').remove();

  // halo properties
  var yshift = 20;

  var svg = d3.select("#haloprop")
              .append("svg")
              .attr("width", hpw)
              .attr("height", hph);

  svg.selectAll("rect")
     .data(halopropdata)
     .enter()
     .append("rect")
     .attr("x", 90)
     .attr("y", function(d, i) {
       return i * 25 + yshift;
     })
     .attr("width", function(d, i) {
       return d[Object.keys(d)[0]];
     })
     .attr("height", 20)
     .attr("fill", "lightgreen");

  svg.selectAll("text")
     .data(halopropdata)
     .enter()
     .append("text")
     .attr("x", 10)
     .attr("y", function(d, i) {
       return i * 25 + 15 + yshift;
     })
     .text(function(d, i) {
       return Object.keys(d)[0];
     })
     .attr("fill", "lightgrey");
}

// p5559 initialization
function init() {
  // init_gui();
  init_three();
  init_dat();
  update_d3();

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

  update_d3();

  // if (tree_data !== undefined)
  //   update_tree();
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
      tree_data = d;
      update_halos(d, three_tree);
      update_tree(d);
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

      // update d3
      halopropdata[0]['Mass'] = halos_time[index].mvir / 1e12;
      halopropdata[1]['Radius'] = halos_time[index].rvir / 10;
      halopropdata[2]['Spin'] = halos_time[index].Spin * 5000;
      halopropdata[3]['Velocity X'] = Math.abs(halos_time[index].vx);
      halopropdata[4]['Velocity Y'] = Math.abs(halos_time[index].vy);
      halopropdata[5]['Velocity Z'] = Math.abs(halos_time[index].vz);

      update_d3();

      document.getElementById("halotitle").innerHTML = "Halo " + halos_time[index].id;
    }
  }
}

// entry of p5559
$(document).ready(function () {
  init();
  resize();
  update();
});

// tree related
function update_tree(data) {
  // remove svg
  d3.select("#tree_svg_id").remove();

  // our data
  var dataMap = data.reduce(function(map, node) {
  node.name = node.id;
  map[node.name] = node;
   return map;
  }, {});

  // create the tree array
  var treeData = [];
  data.forEach(function(node) {
   // add to parent
   var parent = dataMap[node.desc_id];
   if (parent) {
     // create child array if it doesn't exist
     (parent.children || (parent.children = []))
       // add node to child array
       .push(node);
   } else {
     // parent is null or missing
     treeData.push(node);
   }
  });




    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    // size of the diagram
    var viewerWidth = $(document).width();
    var viewerHeight = $(document).height();

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // A recursive helper function for performing some setup by walking through all nodes

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData[0], function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);

    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // sort the tree according to the node names

    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }
    // Sort the tree initially incase the JSON isn't in a sorted order.
    sortTree();

    // TODO: Pan function, can be better implemented.

    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }


    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initiateDrag(d, domNode) {
        draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (nodes.length > 1) {
            // remove link paths
            links = tree.links(nodes);
            nodePaths = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
        }

        // remove parent link
        parentLink = tree.links(tree.nodes(draggingNode.parent));
        svgGroup.selectAll('path.link').filter(function(d, i) {
            if (d.target.id == draggingNode.id) {
                return true;
            }
            return false;
        }).remove();

        dragStarted = null;
    }

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#treeviewer").append("svg")
        .attr("id","tree_svg_id")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);


    // Define the drag listeners for drag/drop behaviour of nodes.
    dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                }
                if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                    if (typeof selectedNode.children !== 'undefined') {
                        selectedNode.children.push(draggingNode);
                    } else {
                        selectedNode._children.push(draggingNode);
                    }
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                expand(selectedNode);
                sortTree();
                endDrag();
            } else {
                endDrag();
            }
        });

    function endDrag() {
        selectedNode = null;
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
        d3.select(domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
        updateTempConnector();
        if (draggingNode !== null) {
            update(root);
            centerNode(draggingNode);
            draggingNode = null;
        }
    }

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.y0,
                    y: selectedNode.x0
                },
                target: {
                    x: draggingNode.y0,
                    y: draggingNode.x0
                }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 2;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData[0];
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
}
