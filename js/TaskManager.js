/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo ErrorDialog AMO REQ Template OPT setTimeout $ Element
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange    = this.handleLoginChange.bind(this);
    this.handleSrchlChange    = this.handleSrchlChange.bind(this);
    this.processTaskDownloads = this.processTaskDownloads.bind(this);

    this.lso = new Mojo.Model.Cookie("last search");
    this.lastSearch = this.lso.get();

    Mojo.Log.info("TaskManager() [lastSearch: %s]", this.lastSearch);

    AMO.registerLoginChange(this.handleLoginChange);
    AMO.registerSrchlChange(this.handleSrchlChange);

    this.tasksChangeCallback = [];
    this.taskChangeCallback = {};

    this.e = new ErrorDialog("TaskManager");
    this.E = this.e.showError;
}

/*}}}*/

/* {{{ */ TaskManager.prototype.handleSrchlChange = function(sl) {
    Mojo.Log.info("TaskManager::handleSrchlChange()");

    this.namedSearches = [];

    var i;

    if( OPT.predefinedSearches )
        for(i=0; i<OPT.predefinedSearches.length; i++)
            this.namedSearches.push( OPT.predefinedSearches[i] );

    if( sl )
        for(i = sl.length-1; i>=0; i--)
            this.namedSearches.unshift({name: "[+] " + sl[i].name, tokens: sl[i].tokens});
};

/*}}}*/
/* {{{ */ TaskManager.prototype.getSearchByName = function(name) {
    Mojo.Log.info("TaskManager::getSearchByName(name=%s)", name);

    var i;

    if( this.namedSearches ) {
        for(i=0; i<this.namedSearches.length; i++)
            if( this.namedSearches[i].name === name )
                return this.namedSearches[i].tokens;
    }

    Mojo.Log.error("TaskManager::getSearchByName(name=%s) nothing found?", name);

    return "";
};

/*}}}*/
/* {{{ */ TaskManager.prototype.getSearchNames = function() {
    Mojo.Log.info("TaskManager::getSearchNames()");

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

    if( !current )
        return;

    this.currentLogin_re = new RegExp("<" + current + ">");
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
/* {{{ */ TaskManager.prototype.setLastSearch = function(s) {
    Mojo.Log.info("TaskManager::setLastSearch(s=%s; lastSearch=%s)", s, this.lastSearch);

    s = s.replace(/\s+/g, "/");

    if( this.lastSearch !== s ) {
        Mojo.Log.info("TaskManager::setLastSearch() [setting cookie, lso.put(%s)]", s);
        this.lso.put(s);
    }

    return (this.lastSearch = s);
};

TaskManager.prototype._getLastSearchSpaced = function(s) {
    if( !this.lastSearch )
        return "";

    return this.lastSearch.replace(/\//g, ' '); // heh
};

/*}}}*/
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !search ) {
        if( !this.lastSearch ) {
            search = this.getSearchByName(OPT.defaultSearch);

        } else {
            search = this.lastSearch;
        }
    }

    search = this.setLastSearch(search);

    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::searchTasks()',
        method: 'post', url: 'http://hiveminder.com/=/action/DownloadTasks.json',
        params: {format: 'json', query: search},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin, search],

        process: this.processTaskDownloads,

        finish: function(r) {
            Mojo.Log.info("TaskManager::searchTasks(%s) [finish: |r|:%d, rca=%d]", search, r.length, r._req_cacheAge);

            // can be either a fresh request or a cache result
            me.tasks = r;
            me.tasks.each(function(t){
                t._req_cacheAge = r._req_cacheAge;
                if( !t.tags ) t.tags = "<none>";
            });
            me.notifyTasksChange();
            me.getFurtherDetails(r._req_cacheAge);
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::searchTasks() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task search ...");

            me.E("searchTasks", "search fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.fetchOneTask = function(rl,force) {
    var search = "id/" + rl;

    Mojo.Log.info("TaskManager::fetchOneTask(%s,[%s])", search, force ? "force" : "cache ok");

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::fetchOneTask()',
        method: 'post', url: 'http://hiveminder.com/=/action/DownloadTasks.json',
        params: {format: 'json', query: search},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin, search],

        process: this.processTaskDownloads,

        finish: function(r) {
            Mojo.Log.info("TaskManager::fetchOneTask(%s) [finish: |r|:%d, rca:%d]", search, r.length, r._req_cacheAge);

            var theTask = r[0];

            for(var i=0; i<me.tasks.length; i++)
                if( me.tasks[i].id === theTask.id )
                    me.tasks[i] = theTask;

            me.notifyTaskChange(theTask,true);
            me.getFurtherDetails(r._req_cacheAge, "id " + rl);
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::fetchOneTask() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task search ...");

            me.E("findOneTask", "find fail", e.join("; "));

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

    callback(tasks, this.lastSearch);
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
/* {{{ */ TaskManager.prototype.notifyTaskChange = function(task,forceCommentSkipCache) {
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

    // NOTE: go fetch the comments if the task has just been updated and
    // therefore nolonger has comments defined, but don't bother with it unless
    // someone asked.

    if( interestedParties && !task.comments )
        this.getComments(task,forceCommentSkipCache);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.notifyTaskChangeStep = function(callback, task) {
    Mojo.Log.info("TaskManager::notifyTaskChangeStep(record_locator=%s)", task.record_locator);

    callback(task);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.getComments = function(task,force) { var rl; var cma;
    Mojo.Log.info("TaskManager::getComments(record_locator=%s, cma=%d, force=%s)",
        rl = task.record_locator, cma = task._req_cacheAge, !!force);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::getComments(record_locator=' + rl + ')',
        method: 'get', url: 'http://hiveminder.com/mobile/task_history/' + rl,
        params: {},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin],
        cacheMaxAgeOverride: cma,

        xml: true, // not a JSON request

        process: function(r) { // this is a new success result
            var ret = [];

            var matches; // this seems fragile, but it works for now
            if( matches = r.match(/<dl[^<>]*transactions[^<>]*>((?:.|\n)*)<\/dl>/) ) {
                r = matches[1]; matches = [];

                var container = new Element("div");
                    container.innerHTML = r;

                container.select("div.transaction").each(function(t){
                    try      { ret.push({row_html: t.innerHTML}); }
                    catch(e) { Mojo.Log.info("TaskManager::getComments() [problem finding inner html for transaction: %s]", e); }
                });
            }

            return ret;
        },

        finish: function(r) {
            Mojo.Log.info("TaskManager::getComments(id/%s) [finish: |r|:%d; rca:%d]", rl, r.length, r._req_cacheAge);

            task.comments = r;
            me.notifyTaskChange(task);
        },

        success: function(r) {
            if( r.match(/^<\?xml/) )
                return true;

            Mojo.Log.info("TaskManager::getComments() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong while retrieving comments...");

            me.E("getComments", "get fail", e.join("; "));

            return false;
        }
    });

};

/*}}}*/
/* {{{ */ TaskManager.prototype.getFurtherDetails = function(cma,tokens) {

    if( !tokens )
        tokens = this._getLastSearchSpaced();

    Mojo.Log.info("TaskManager::getFurtherDetails(cma: %d, tokens: %s)", cma, tokens);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::getFurtherDetails()',
        method: 'post', url: 'http://hiveminder.com/=/action/TaskSearch.json',
        params: {tokens: tokens},

        cacheable: true,
        keyStrings: [this.currentLogin, tokens],
        cacheMaxAgeOverride: cma, // we're never interested in a cache older than our tasks

        process: function(r) {
            var ret = [];
            var T = r.content.tasks;
            var i,t,k;

            for(i=0; i<T.length; i++) {
                t = T[i];
                ret.push({

                    but_first_count: t.depends_on_count,
                    but_first_html:  "<ul><li>" + t.depends_on_summaries.escapeHTML().replace(/\t/g, "</li><li>") + "</li></ul>",

                    and_then_count: t.depended_on_by_count,
                    and_then_html:  "<ul><li>" + t.depended_on_by_summaries.escapeHTML().replace(/\t/g, "</li><li>") + "</li></ul>",

                    id: t.id
                });
            }

            return ret;
        },

        finish: function(r) {
            Mojo.Log.info("TaskManager::getFurtherDetails(%s) [finish: |r|:%d; rca:%d]", tokens, r.length, r._req_cacheAge);

            for(var i=0; i<me.tasks.length; i++) { var mt = me.tasks[i];
            for(var j=0; j<r.length; j++) {        var rt = r[j];
                if( mt.id == rt.id ) { // STFU: we really do want the soft == here, one side seems to be string vs number
                    delete rt.id; // no need to copy this over

                    for( var k in rt )
                        mt[k] = rt[k];
                }
            }}

            me.notifyTasksChange();
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::getFurtherDetails() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task search sequel ...");

            me.E("getFurtherDetails", "get fail", e.join("; "));

            return false;
        }
    });

};

/*}}}*/

/* {{{ */ TaskManager.prototype.processTaskDownloads = function(r) {
    var currentTime = new Date();
    var month = "" + (currentTime.getMonth() + 1);
    var day   = "" + currentTime.getDate();
    var year  = "" + currentTime.getFullYear();
    var now   = year + (month.length===2 ? month : "0"+month) + (day.length===2 ? day : "0"+day);

    var jsonStr = r.content.result;
    delete r; // STFU: this actually works, but jslint thinks it shouldn't.

    var RE = this.currentLogin_re;
    return this.processJSONString(jsonStr, "process-task-downloads").each(function(t){
        if( t.due ) {
            var d = t.due.replace(/\D+/g, "");
            t.due_class = now>d ? "overdue" : "regular-due";

        } else {
            t.due_class = "not-due";
        }

        t.accepted_class = t.accepted ? "accepted" : "not-accepted";

        t.desc_class = t.description.match(/\S/) ? "" : "generically-hidden";

        if( t.time_worked   === "~" ) delete t.time_worked;
        if( t.time_left     === "~" ) delete t.time_left;
        if( t.time_estimate === "~" ) delete t.time_estimate;

        if( t.time_worked ) {
            t.hours_txt = t.time_worked;

            if( t.time_left )
                t.hours_txt += " / " + t.time_left;

            t.hours_class = "time-worked";

        } else if( t.time_left ) {
            t.hours_txt = "0h / " + t.time_left;
            t.hours_class = "time-worked not-started";

        } else {
            t.hours_class = "generically-hidden";
        }

        if( t.group ) {
            t.group_txt   = t.group;
            t.group_class = "group";

        } else {
            t.group_class = "generically-hidden";
        }

        if( OPT.hideOnwerRequestorWhenSelf && RE ) {
            Mojo.Log.info("TaskManager::processTaskDownloads() hiding o/r/n using %s against %s/%s/%s",
                RE, t.owner, t.requestor, t.next_action_by);

            if( t.owner.match(RE) || t.owner === "<>" || !t.owner )
                t.owner_class = "generically-hidden";

            if( t.requestor.match(RE) || t.requestor === "<>" || !t.requestor )
                t.requestor_class = "generically-hidden";

            if( t.next_action_by.match(RE) || t.next_action_by === "<>" || !t.next_action_by )
                t.next_action_by_class = "generically-hidden";

        } else {
            Mojo.Log.info("TaskManager::processTaskDownloads() not attempting to hide o/r/n: opt:%s re:%s",
                OPT.hideOnwerRequestorWhenSelf, RE);
        }

    });
};

/*}}}*/

/* {{{ */ TaskManager.prototype.fixutf8 = function (utftext) {

    // stolen from: http://www.webtoolkit.info/javascript-utf8.html

    if( true )
    return utftext; // XXX: disabled, was causing grief.  It's possible the HM team fixed this anyway.

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
/* {{{ */ TaskManager.prototype.processJSONString = function(str, desc) {
    var json;
    var t;

    try { str = this.fixutf8(str); } catch(e1) {
        t = new Template("Problem fixing utf8 (where necessary) on string during \"#{desc}\" request: #{error}");
        this.E("processJSONString", "utf8 fail", t.evaluate({desc: desc, error: e1}));
        return [];
    }

    try { json = str.evalJSON(); } catch(e2) {
        t = new Template("Problem evaluating JSON string during \"#{desc}\" request: #{error}");
        this.E("processJSONString", "eval fail", t.evaluate({desc: desc, error: e2}));
        return [];
    }

    return json;
};

/*}}}*/

/* {{{ */ TaskManager.prototype.postNewTask = function(params,cb) {
    Mojo.Log.info("TaskManager::postNewTask()");

    var me = this;

    REQ.doRequest({
        method: 'post', url: 'http://hiveminder.com/=/action/CreateTask.json',
        params: params, cacheable: false,
        process:  function(r) {},
        finish:   function(r) {
            if( cb ) {
                try { cb(); } catch(e) {
                    me.E("postNewTask", "post succeeded", "failed to issue callback after successfully posting task: " + e);
                }
            }
        },
        succcess: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::postNewTask() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task post ...");

            me.E("postNewTask", "post fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');
