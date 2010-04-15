/*jslint white: false, onevar: false, maxerr: 500000
*/
/*global Mojo AMO REQ Template OPT setTimeout $
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange = this.handleLoginChange.bind(this);
    this.handleAcdetChange = this.handleAcdetChange.bind(this);

    this.lso = new Mojo.Model.Cookie("last search");
    this.lastSearch = this.lso.get();

    Mojo.Log.info("TaskManager() [lastSearch: %s]", this.lastSearch);

    AMO.registerLoginChange(this.handleLoginChange);
    AMO.registerAcdetChange(this.handleAcdetChange);

    this.tasksChangeCallback = [];
    this.taskChangeCallback = {};
}

/*}}}*/

/* {{{ */ TaskManager.prototype.handleAcdetChange = function(acdet) {
    Mojo.Log.info("TaskManager::handleAcdetChange()");

    var i;

    this.namedSearches = OPT.predefinedSearches;
    Mojo.Log.info("TaskManager::handleAcdetChange() [namedSearches: %s]", Object.toJSON(this.namedSearches));

    // TODO: go through acdet if applicable
};

/*}}}*/
/* {{{ */ TaskManager.prototype.getSearchByName = function(name) {
    Mojo.Log.info("TaskManager::getSearchByName(name=%s) [namedSearches: %s]", name, Object.toJSON(this.namedSearches));

    var i;

    if( this.namedSearches ) {
        for(i=0; i<this.namedSearches.length; i++)
            if( this.namedSearches[i].name === name )
                return this.namedSearches[i].tokens
    }

    Mojo.Log.error("TaskManager::getSearchByName(name=%s) [namedSearches: %s] nothing found?",
        name, Object.toJSON(this.namedSearches));

    return "";
};

/*}}}*/
/* {{{ */ TaskManager.prototype.getSearchNames = function() {
    Mojo.Log.info("TaskManager::getSearchNames() [namedSearches: %s]", Object.toJSON(this.namedSearches));

    var i;
    var ret = [];

    if( this.namedSearches ) {
        for(i=0; i<this.namedSearches.length; i++)
            ret.push(this.namedSearches[i].name);
    }

    return ret;
};

/*}}}*/

/* {{{ */ TaskManager.prototype.handleLoginChange = function(emails,current) {
    Mojo.Log.info("TaskManager::handleLoginChange(current=%s)", current);

    this.currentLogin = current;

    if( current )
        this.searchTasks();

};

/*}}}*/
/* {{{ */ TaskManager.prototype.activate = function() {
    this.searchTasks();
};

/*}}}*/
/* {{{ */ TaskManager.prototype.namedSearchTasks = function(name,force) {
    Mojo.Log.info("TaskManager::namedSearchTasks(%s,[%s])", name, force ? "force" : "cache ok");
    this.searchTasks(this.getSearchByName(name),force);
};

/*}}}*/
TaskManager.prototype.setLastSearch = function(s) {
    Mojo.Log.info("TaskManager::setLastSearch(s=%s; lastSearch=%s)", s, this.lastSearch);

    s = s.replace(/\s+/g, "/");

    if( this.lastSearch !== s ) {
        Mojo.Log.info("TaskManager::setLastSearch() [setting cookie, lso.put(%s)]", s);
        this.lso.put(s);
    }

    return (this.lastSearch = s);
};
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !search ) {
        if( !this.lastSearch ) {
            search = this.getSearchByName(OPT.defaultSearch);

        } else {
            search = this.lastSearch;
        }
    }

    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::searchTasks()',
        method: 'post', url: 'http://hiveminder.com/=/action/DownloadTasks.json',
        params: {format: 'json', query: this.setLastSearch(search)},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin, search],

        process: function(r) {
            var currentTime = (new Date());
            var month = "" + (currentTime.getMonth() + 1);
            var day   = "" + currentTime.getDate();
            var year  = "" + currentTime.getFullYear();
            var now   = year + (month.length==2 ? month : "0"+month) + (day.length==2? day : "0"+day);

            return me.fixutf8( r.content.result ).evalJSON().each(function(t){
                if( t.due ) {
                    var d = t.due.replace(/\D+/g, "");
                    t.due_class = now>d ? "overdue" : "regular-due";

                } else {
                    t.due_class = "not-due";
                }

            });
        },

        finish: function(r) {
            // can be either a fresh request or a cache result
            me.tasks = r;
            me.notifyTasksChange();
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::searchTasks() r.fail, r=%s", Object.toJSON(r));

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task search ...");

            Mojo.Controller.errorDialog(e.join("... "));

            return false;
        }
    });
};

/*}}}*/

/* {{{ */ TaskManager.prototype.registerTasksChange = function(callback) {
    Mojo.Log.info("TaskManager::registerTasksChange()");

    this.tasksChangeCallback.push(callback);
    this.notifyTasksChangeStep(callback);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.unregisterTasksChange = function(callback) {
    Mojo.Log.info("TaskManager::unregisterTasksChange()");

    this.tasksChangeCallback = this.tasksChangeCallback.reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChangeStep = function(callback) {
    Mojo.Log.info("TaskManager::notifyTasksChangeStep()");

    var tasks = [];

    // r={"success": 1, "content": {"result":
    // "[{\"priority\":3,\"record_locator\":\"xxxx\",\"time_worked\":null,\"attachment_count\":0,\"repeat_period\":
    // \"once\",\"group\":null,\"summary\":\"test task 2 (due
    // today)\",\"time_left\":null,\"id\":xxxxx,\"repeat_every\":1,\"owner\":\"Paul

    if( this.tasks )
        for(var i=0; i<this.tasks.length; i++)
            tasks.push( this.tasks[i] );
         // tasks.push( Object.clone(this.tasks[i]) ); // shallow copy, but this should be good enough

    callback(tasks);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTasksChange = function() {
    Mojo.Log.info("TaskManager::notifyTasksChange()");

    var i;

    for( i=0; i<this.tasksChangeCallback.length; i++ )
        this.notifyTasksChangeStep(this.tasksChangeCallback[i]);

    for( i=0; i<this.tasks.length; i++ )
        this.notifyTaskChange(this.tasks[i]);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.registerTaskChange = function(callback, task) { var rl;
    Mojo.Log.info("TaskManager::registerTaskChange(record_locator=%s)", rl = task.record_locator);

    if( !this.taskChangeCallback[rl] )
        this.taskChangeCallback[rl] = [];

    this.taskChangeCallback[rl].push(callback);

    if( !task.comments )
        this.getComments(task);

    this.notifyTaskChangeStep(callback, task);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.unregisterTaskChange = function(callback, task) { var rl;
    Mojo.Log.info("TaskManager::unregisterTaskChange(record_locator=%s)", rl = task.record_locator);

    this.taskChangeCallback[rl] =
        this.taskChangeCallback[rl].reject(function(_c){ return _c === callback; });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTaskChange = function(task) {
    var rl  = task.record_locator; 
    var tcc = this.taskChangeCallback[rl];

    var interestedParties = 0;

    if( tcc ) {
        Mojo.Log.info("TaskManager::notifyTaskChange(record_locator=%s)", rl);

        for( var i=0; i<tcc.length; i++ ) {
            this.notifyTaskChangeStep(tcc[i], task);
            interestedParties ++;
        }
    }

    if( interestedParties && !task.comments )
        this.getComments(task);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTaskChangeStep = function(callback, task) {
    Mojo.Log.info("TaskManager::notifyTaskChangeStep(record_locator=%s)", task.record_locator);

    callback(task);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.getComments = function(task) { var rl;
    Mojo.Log.info("TaskManager::getComments(record_locator=%s)", rl = task.record_locator);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::getComments(record_locator=' + rl + ')',
        method: 'get', url: 'http://hiveminder.com/mobile/task_history/' + rl,
        params: {},

        cacheable: true,
        keyStrings: [this.currentLogin, 'getComments', rl],
        cacheMaxAgeOverride: task._req_cacheAge, // we're rarely going to be intersted in comments older than the task

        xml: true, // not a JSON request

        process: function(r) { // this is a new success result
            var ret = [];

            var matches; // this seems fragile, but it works for now
            if( matches = r.match(/<dl[^<>]*transactions[^<>]*>((?:.|\n)*)<\/dl>/) ) {
                r = matches[1]; matches = [];

                var container = new Element("div");
                    container.innerHTML = r;

                container.select("div.transaction").each(function(t){
                    Mojo.Log.info("TaskManager::getComments() [found transaction div]");

                    try      { ret.push({row_html: t.innerHTML}); }
                    catch(e) { Mojo.Log.info("TaskManager::getComments() [problem finding inner html for transaction: %s]", e); }
                });
            }

            return ret;
        },

        finish: function(r) {
            task.comments = r;
            me.notifyTaskChange(task);
        },

        success: function(r) {
            if( r.match(/^<\?xml/) ) 
                return true;

            Mojo.Log.info("TaskManager::getComments(%s) r=%s", rl, Object.toJSON(r));

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while retrieving comments...");

            Mojo.Controller.errorDialog(e.join("... "));

            return false;
        }
    });

};

/*}}}*/

/* {{{ */ TaskManager.prototype.fixutf8 = function (utftext) { // stolen from: http://www.webtoolkit.info/javascript-utf8.html
    var str = "";
    var i = 0;
    var c,c1,c2,c3;

    while( i<utftext.length ) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
            str += String.fromCharCode(c);
            i++;

        } else if((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i+1);
            str += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;

        } else {
            c2 = utftext.charCodeAt(i+1);
            c3 = utftext.charCodeAt(i+2);
            str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }

    }

    return str;
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');
