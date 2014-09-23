var timer = require("./timer");
var models = require("../data/mongoose/allModel");
var env=require("../env");
var cache = require("./cache/" + env.get("CACHE_TYPE", "mem"));
var CheckModel = models["Check"];
var log = require("../log");
var runner=require("./runner");
function init(cb) {
  log.info("Check Manager subscribe to timer.");
  timer.onTime(onTimerCall);
  cb();
}

function onTimerCall() {
  log.info("Timer call on check manager. Start to list check models.");
  loadCacheList(function(err, allChecks) {
    if (err) {
      log.error(err);
      return;
    }
    log.info("Check models listed. start to find checks to run.");
    for (var i = 0; i < allChecks.length; i++) {
      var obj = allChecks[i];
      var interval = obj.interval;
      var lastRun = obj.lastRun;
      var now = new Date();
      if (!lastRun || (now-lastRun) >= interval * 60 * 1000) {
        log.info("Found a Check to run. Check information:"+JSON.stringify(obj));
        run(obj._id,function(){});
      }
    }
    log.info("Timer call finished.");
  });
}
//cache all check models
function cacheList(cb) {
  loadListFromDb(function(err, list) {
    if (err) {
      cb(err);
    } else {
      log.info("Set list to cache");
      cache.set("allChecksInterval", JSON.stringify(list));
      cb(null, list);
    }
  });
}

function loadListFromDb(cb) {
  log.info("Load check list from database.");
  CheckModel.find({
    status:{$ne:1} 
  }, {
    _id: 1,
    interval: 1,
    lastRun: 1,
    type:1
  }, function(err, allChecks) {
    if (err) {
      cb(err);
    } else {
      cb(null, allChecks);
    }
  });
}

function loadCacheList(cb) {
  log.info("List check list from cache.");
  cache.get("allChecksInterval", function(err, res) {
    if (!err && res) {
      cb(null, JSON.parse(res));
    }
    log.info("Cache not hit. Start to cache check list.");
    cacheList(cb);
  });

}

function loadCheck(checkId, cb) {
  CheckModel.findById(checkId, cb);
}

function run(checkId,cb) {
  loadCheck(checkId, function(err, check) {
    if (err) {
      log.error("Failed to run check instance.");
      log.error(checkId);
      log.error(err);
    } else {
      runner.runCheck(check,cb);
    }
  });
}
module.exports={
  run:run,
  init:init,
  onTimerCall:onTimerCall
}
