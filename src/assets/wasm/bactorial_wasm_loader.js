var bactorialSelect;
var bactorialDivide;

var globals = {
  statePointer: 0,
  objects: []
};

var Module = {
  onRuntimeInitialized: init,
};

function init() {
  globals.statePointer = Module._BactorialInitWorld(10, 10.0, 1);
  Module._BactorialUpdateWorld(1/60);
  loadState();
  console.log('World initialized');

  var id = setInterval(doFrame, 3000);
};

function loadState() {
  var objectCount = Module.getValue(globals.statePointer, "i32");
  // console.log('Object count: ' + objectCount);

  var objectsData = globals.statePointer + 4;

    for (i=0; i<objectCount; ++i) {
    var positions = Module.getValue(objectsData, "*");
    objectsData += 4;
    var velocities = Module.getValue(objectsData, "*");
    objectsData += 4;
    var radii = Module.getValue(objectsData, "*");
    objectsData += 4;
    objectsData += 4;
    var seeds = Module.getValue(objectsData, "*");

    for (var i=0; i<objectCount; ++i) {
        var x = Module.getValue(positions, "float");
        positions += 4;
        var y = Module.getValue(positions, "float");
        positions += 4;
        // console.log(' position: {' + x + ', ' + y + '}');
        globals.objects.push({x,y});
    }

    for (var i=0; i<objectCount; ++i) {
        var x = Module.getValue(velocities, "float");
        velocities += 4;
        var y = Module.getValue(velocities, "float");
        velocities += 4;

        globals.objects[i].velocity = {x:x, y:y};
    }

    for (var i=0; i<objectCount; ++i) {
        var r = Module.getValue(radii, "float");
        radii += 4;

        globals.objects[i].radius = r;
    }

    for (var i=0; i<objectCount; ++i) {
        var x = Module.getValue(seeds, "float");
        seeds += 4;
        var y = Module.getValue(seeds, "float");
        seeds += 4;

        // globals.objects[i].seed = {x:x, y:y};

        console.log(' seed: {' + x + ', ' + y + '}');
    }
  }
}