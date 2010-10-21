/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo ErrorDialog AMO REQ Template OPT setTimeout $ Element $H $A nqsplit rl2id id2rl
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange    = this.handleLoginChange.bind(this);
    this.handleSrchlChange    = this.handleSrchlChange.bind(this);
    this.processTaskDownloads = this.processTaskDownloads.bind(this);

    this.lso = new Mojo.Model.Cookie("last search");
    this.lastSearch = this.lso.get();
    if( typeof this.lastSearch !== "object" )
        this.lastSearch = {};

    this.dbNewk = function() { this.lso.put(0); }.bind(this);

    Mojo.Log.info("TaskManager() [lastSearch: %s]", Object.toJSON(this.lastSearch));

    AMO.registerLoginChange(this.handleLoginChange);
    AMO.registerSrchlChange(this.handleSrchlChange);

    this.tasksChangeCallback = [];
    this.taskChangeCallback = {};

    this.e = new ErrorDialog("TaskManager");
    this.E = this.e.showError;

    this.searchCacheSnoop = {};
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
    Mojo.Log.info("TaskManager::setLastSearch(s=%s; lastSearch=%s)", s, Object.toJSON(this.lastSearch));

    s = s.replace(/\s+/g, "/");

    if( this.lastSearch[this.currentLogin] !== s ) {
        this.lastSearch[this.currentLogin] = s;
        Mojo.Log.info("TaskManager::setLastSearch() [setting cookie, lso.put(%s)]", Object.toJSON(this.lastSearch));
        this.lso.put(this.lastSearch);
    }

    return s;
};

TaskManager.prototype.getLastSearchSpaced = function() {
    if( !this.lastSearch[this.currentLogin] )
        return "";

    // cannonically, actual slashes are encoded as %252F at this point...
    return this.lastSearch[this.currentLogin].replace(/\//g, ' ').replace(/%252F/, "/");
};

TaskManager.prototype.getLastSearch = function() {
    if( !this.lastSearch[this.currentLogin] )
        return "";

    return this.lastSearch[this.currentLogin];
};

TaskManager.prototype.getLastSearchKeyed = function() {
    var res = {};

    if( !this.lastSearch[this.currentLogin] )
        return res;

    var arz = this.lastSearch[this.currentLogin].split("/");

    var i;
    for(i=0; i<arz.length; i++)
        if( arz[i].match(/%252f/) )
            arz[i] = arz[i].replace(/%252f/, "/");

    var _not = false;
    var lk;
    for(i=0; i<arz.length; i++) {
        Mojo.Log.info("glsk-topswitch(arz[%d]=%s)", i, arz[i]);

        switch(arz[i]) {
            case "not":
                _not = true;
                break;

            case "sort_by_tags":
            case "sort_by":
            case "group":
                if(_not) Mojo.Log.error("glsk-not-error (1)"); // STFU: this looks fine to me, think jslint fail
            case "tag":
            case "query":
            case "owner":
            case "summary":
            case "requestor":
            case "description":
                res[lk= (_not ? "not/" : "") + arz[i] ] = arz[++i];
                _not = false;
                break;

            case "unaccepted":
                if(_not) Mojo.Log.error("glsk-not-error (2)"); // STFU: this looks fine to me, think jslint fail
            case "accepted":
            case "complete":
                res[lk= (_not ? "not/" : "") + arz[i] ] = true;
                _not = false;
                break;

            case "hidden":
                switch(arz[++i]) {
                    case "forever":
                        res[lk= (_not ? "not/" : "") + "hidden/forever" ] = true;
                        _not = false;
                        break;
                    case "until":
                        switch(arz[++i]) {
                            case "after":  res[lk="hidden/until/after"]  = arz[++i]; break;
                            case "before": res[lk="hidden/until/before"] = arz[++i]; break;
                            default: Mojo.Log.error("glsk-hid-error: arz[%d]=%s", i, arz[i]); break;
                        }
                        break;
                    default: Mojo.Log.error("glsk-error not until?"); break;
                }
                break;

            case "completed":
            case "due": switch(arz[++i]) {
                case "before": res[lk=arz[i-1] + "/before"] = arz[++i]; break;
                case "after":  res[lk=arz[i-1] + "/after"]  = arz[++i]; break;
                default: Mojo.Log.error("glsk-d/c-error: arz[%d]=%s", i, arz[i]); break;
            }
            break;

            case "priority": switch(arz[++i]) {
                case "above": res[lk="priority/above"] = arz[++i]; break;
                case "below": res[lk="priority/below"] = arz[++i]; break;
                default: Mojo.Log.error("glsk-prio-error: arz[%d]=%s", i, arz[i]); break;
            }
            break;

            case "but":
                if( arz[++i] !== "first" ) Mojo.Log.error("glsk-but-error");
                res[lk="but/first"] = arz[++i];
                break;

            case "and":
                if( arz[++i] !== "then" ) Mojo.Log.error("glsk-and-error");
                res[lk="and/then"] = arz[++i];
                break;

            case "next":
                if( arz[++i] !== "action" ) Mojo.Log.error("glsk-next-!action-error");
                if( arz[++i] !== "by"     ) Mojo.Log.error("glsk-next-!by-error");
                res[lk= (_not ? "not/" : "") + "next/action/by" ] = arz[++i];
                _not = false;
                break;

            case "time":
                switch(arz[++i]) {
                    case "estimate":
                    case "worked":
                    case "left":
                        switch(arz[++i]) {
                            case "gt":
                            case "lt":
                                res[lk= "time/" + arz[i-1] + "/" +  arz[i] ] = arz[++i];
                                break;
                            default: Mojo.Log.error("glsk-time2-error: arz[%d]=%s", i, arz[i]); break;
                        }
                        break;
                    default: Mojo.Log.error("glsk-time1-error: arz[%d]=%s", i, arz[i]); break;
                }
                break;

            default:
                Mojo.Log.info("glsk-def-action: append %s (%s) with %s", lk, res[lk], arz[i]);
                res[lk] += " " + arz[i];
                break;
        }
    }

    return res;
};

/*}}}*/
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !this.currentLogin )
        return; // we are not worthy

    if( !search ) {
        var ls = this.getLastSearch();

        if( !ls || !ls.length ) {
            search = this.getSearchByName(OPT.defaultSearch);

        } else {
            search = ls;
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

                if(!me.searchCacheSnoop[t.record_locator] )
                    me.searchCacheSnoop[t.record_locator] = {};

                me.searchCacheSnoop[t.record_locator][r._req_cacheKey] = true;
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
          desc: 'TaskManager::fetchOneTask(rl=' + rl + ')',
        method: 'post', url: 'http://hiveminder.com/=/action/DownloadTasks.json',
        params: {format: 'json', query: search},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin, search],

        process: this.processTaskDownloads,

        finish: function(r) {
            Mojo.Log.info("TaskManager::fetchOneTask(%s) [finish: |r|:%d, rca:%d]", search, r.length, r._req_cacheAge);

            var i;
            var theTask;

            if( r.length ) {
                theTask = r[0];

                for(i=0; i<me.tasks.length; i++)
                    if( me.tasks[i].id === theTask.id )
                        me.tasks[i] = theTask;

            } else {
                theTask = {
                    summary:       '<task is missing, permission denied?, deleted?>',
                    missing_class: 'generically-hidden',
                    record_locator: rl
                };

                for(i=0; i<me.tasks.length; i++)
                    if( me.tasks[i].record_locator === rl )
                        me.tasks[i] = theTask;
            }

            me.notifyTaskChange(theTask,true);
            me.getFurtherDetails(r._req_cacheAge, "id " + rl);

            // me.searchCacheSnoop[t.record_locator][r._req_cacheKey] = true;
            var cs = me.searchCacheSnoop[theTask.record_locator];
            if( cs ) { for( var csi in cs ) { if( cs[csi] ) {
                REQ.markCacheStale(csi);
                cs[csi] = false;

            } } }
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
                e.push("Something went wrong with the task fetch ...");

            me.E("findOneTask", "find fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/

/* {{{ */ TaskManager.prototype.registerTasksChange = function(callback) {
    Mojo.Log.info("TaskManager::registerTasksChange()");

    if( this.tasksChangeCallback.length < 1 )
        // this is cached, so it shouldn't hurt to go check the cache times in
        // any case, we may not have looked for a while...
        this.searchTasks();

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

    callback(tasks, this.getLastSearchSpaced());
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
          desc: 'TaskManager::getComments(rl=' + rl + ')',
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
        tokens = this.getLastSearchSpaced();

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

            $A(r.content.tasks).each(function(t){
                var bf = [];
                var at = [];

                if( t.depends_on_ids )     bf = t.depends_on_ids.split(/\s+/);
                if( t.depended_on_by_ids ) at = t.depended_on_by_ids.split(/\s+/);

                ret.push({

                    but_first: bf,
                    and_then:  at,

                    but_first_count: t.depends_on_count,
                    but_first_html:  "<ul><li>" + t.depends_on_summaries.escapeHTML().replace(/\t/g, "</li><li>") + "</li></ul>",

                    and_then_count: t.depended_on_by_count,
                    and_then_html:  "<ul><li>" + t.depended_on_by_summaries.escapeHTML().replace(/\t/g, "</li><li>") + "</li></ul>",

                    id: t.id
                });
            });

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
                e.push("Something went wrong with the extended task fetch ...");

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

        if( !t.tags )
            t.tags = "<none>";

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

        t.for_me_to_take = t.for_me_to_accept = false;

        if( RE ) {
            /*
            Mojo.Log.info("TaskManager::processTaskDownloads() using %s against %s/%s/%s to generate css classes",
                RE, t.owner, t.requestor, t.next_action_by);
            */

            if( t.owner.match(RE) ) {
                if( OPT.hideOnwerRequestorWhenSelf )
                    t.owner_class = "generically-hidden";

                t.waiting_on = "for you";
                t.for_me_to_accept = true;

            } else {
                if( t.owner === "<>" || t.owner.match(/<nobody>/) )
                    t.for_me_to_take = true;

                t.waiting_on = "for other";
            }

            if( t.requestor.match(RE) ) {
                if( OPT.hideOnwerRequestorWhenSelf )
                    t.requestor_class = "generically-hidden";
            }

            if( t.next_action_by.match(RE) ) {

                if( OPT.hideOnwerRequestorWhenSelf )
                    t.next_action_by_class = "generically-hidden";

                t.waiting_on = "for you";

            } else if( t.next_action_by === "<>" || t.next_action_by.match(/<nobody>/) ) {
                t.next_action_by_class = "generically-hidden";
                t.waiting_on = "for other";

            } else {
                t.waiting_on = "for other";
            }

        } else {
            Mojo.Log.info("TaskManager::processTaskDownloads() no re for %s/%s/%s, not generating css classes",
                t.owner, t.requestor, t.next_action_by);
        }

        t.but_first_count =
        t.and_then_count  = 0;

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
          desc: 'TaskManager::postNewTask()',
        method: 'post', url: 'http://hiveminder.com/=/action/CreateTask.json',
        params: params, cacheable: false,
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
/* {{{ */ TaskManager.prototype.updateTask = function(params,task,cb) {

    // NOTE: there are other "manditory" fields, but only this one seems to
    // actually be manditory — manditory in the sense that  if it's absent, HM
    // thinks it's supposed to change it to false

    var i;
    var mandatories = [ "will_complete" ];
    for(i=0; i<mandatories.length; i++)
        if( !(mandatories[i] in params) )
            params[mandatories[i]] = task[mandatories[i]];

    params.id = task.id;

    Mojo.Log.info("TaskManager::updateTask(rl=%s) params: %s", task.record_locator, Object.toJSON(params));

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::updateTask(rl=' + task.record_locator + ')',
        method: 'post', url: 'http://hiveminder.com/=/action/UpdateTask.json',
        params: params, cacheable: false,
        finish:   function(r) {
            me.fetchOneTask(task.record_locator,true);
            // fetchOneTask does a cache snoop for us, don't do it here

            if( cb ) {
                try { cb(); } catch(e) {
                    me.E("updateTask", "post succeeded", "failed to issue callback after successfully updating task: " + e);
                }
            }
        },
        succcess: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::updateTask() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task post ...");

            me.E("updateTask", "post fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.deleteTask = function(task,cb) {
    Mojo.Log.info("TaskManager::deleteTask(rl=%s)", task.record_locator);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::deleteTask(rl=' + task.record_locator + ')',
        method: 'post', url: 'http://hiveminder.com/=/action/DeleteTask.json',
        params: {id: task.id}, cacheable: false,
        finish: function(r) {
            // snoop cache to stale out searchlists with this task

            // me.searchCacheSnoop[t.record_locator][r._req_cacheKey] = true;
            var cs = me.searchCacheSnoop[task.record_locator];
            if( cs ) { for( var csi in cs ) { if( cs[csi] ) {
                REQ.markCacheStale(csi);
                cs[csi] = false;

            } } }

            me.tasks = $A(me.tasks).reject(function(i) { return i.record_locator === task.record_locator; });
            me.notifyTasksChange();

            if( cb ) {
                try { cb(); } catch(e) {
                    me.E("deleteTask", "post succeeded", "failed to issue callback after successfully deleting task: " + e);
                }
            }
        },
        succcess: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::deleteTask() r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task delete ...");

            me.E("deleteTask", "post fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/
/* {{{ */ TaskManager.prototype.completeTask = function(task,comment,cb) {
    Mojo.Log.info("TaskManager::completeTask(rl=%s)", task.record_locator);

    var params = {
        complete: task.complete == "0" ? "1" : "0" // STFU: comes in as a number sometimes, I mean ==
    };

    if( comment )
        params.comment = comment;

    this.updateTask(params,task,cb);
};

/*}}}*/
/* {{{ */ TaskManager.prototype.commentTask = function(task,comment,time_worked,cb) {
    Mojo.Log.info("TaskManager::commentTask(rl=%s): %s", task.record_locator, comment);

    var params = { comment: comment };

    if( time_worked && AMO.isCurrentAccountPro() )
        params.add_time_worked = time_worked;

    if( !comment ) {
        this.E("commentTask", "no comment", "And what would that comment be?");
        return;
    }

    this.updateTask(params,task,cb);
};

/*}}}*/

/* {{{ */ TaskManager.prototype.knownTags = function() {
    var h = {};
    this.tasks.each(function(t){
        $A(nqsplit(t.tags)).each(function(_t){
            if( _t != undefined && _t !== "<none>" ) // STFU: I mean !=
                h[_t] = true;
        });
    });
    Mojo.Log.info("TaskManager::knownTags(): %s", Object.toJSON(h));

    return $H(h).keys().sort();
};

/*}}}*/

// dep stuff

/* {{{ */ TaskManager.prototype.compareTextFieldDeps = function(orig, modi) {
    var h1={};

    if( orig.match(/\S/) ) $A(orig.split(/[,\s]+/)).each(function(d){ h1[rl2id(d)] =1; });
    if( modi.match(/\S/) ) $A(modi.split(/[,\s]+/)).each(function(d){ h1[rl2id(d)] --; });

    var a = [];
    var d = [];

    for(var id in h1) {
        if( h1[id] === 1 )
            d.push(id);

        else if( isNaN(h1[id]) )
            a.push(id);
    }

    var ret = { toAdd: $A(a), toDel: $A(d) };

    Mojo.Log.info("TaskManager::compareTextFieldDeps(%s,%s): %s", orig, modi, Object.toJSON(ret));

    return ret;
};

/*}}}*/

/* {{{ */ TaskManager.prototype.addButFirst = function(parentTaskID,targetTaskID,cb) {
    Mojo.Log.info("TaskManager::addButFirst(%s,%s)", parentTaskID, targetTaskID);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::addButFirst(' + [parentTaskID,targetTaskID].join(",") + ')',
        method: 'post', url: 'http://hiveminder.com/=/action/CreateTaskDependency.json',
        params: {task_id: parentTaskID, depends_on: targetTaskID},

        cacheable: false,

        finish: function(r) {
            if( cb ) {
                cb(parentTaskID,targetTaskID);

            } else {
                me.fetchOneTask(id2rl(parentTaskID),true);
                me.fetchOneTask(id2rl(targetTaskID),true);
            }
        },

        success: function(r) {
            if( "task_id" in r )
                if( r.task_id == parentTaskID ) // STFU: is it a number or a string? can't say
                    return true; // this is a work around for the 302 redirect in CreateTaskDependency

            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::addButFirst(" + [parentTaskID,targetTaskID].join(",") + ") r.fail — %s",
                Object.toJSON(r));

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the task dependency post ...");

            me.E("addButFirst", "add fail", e.join("; "));

            return false;
        }
    });

};

/*}}}*/
/* {{{ */ TaskManager.prototype.delButFirst = function(parentTaskID,targetTaskID,cb) {
    Mojo.Log.info("TaskManager::delButFirst(%s,%s)", parentTaskID, targetTaskID);

    var me = this;

    this.getButFirstID(parentTaskID,targetTaskID,
        function(dID) {
            Mojo.Log.info("TaskManager::delButFirst(%s,%s) did=%s", parentTaskID, targetTaskID, dID);

            REQ.doRequest({
                  desc: 'TaskManager::delButFirst() dID=' + dID,
                method: 'post', url: 'http://hiveminder.com/=/action/DeleteTaskDependency.json',
                params: {id: dID},

                cacheable: false,

                finish: function(r) {
                    if( cb ) {
                        cb(parentTaskID,targetTaskID);

                    } else {
                        me.fetchOneTask(id2rl(parentTaskID),true);
                        me.fetchOneTask(id2rl(targetTaskID),true);
                    }
                },

                success: function(r) {
                    try {
                        if( r.content.search.length === 0 ) {
                            r.success = 0;
                            r.error   = "dependancy not found";
                        }
                    } catch(_ignored_e) {}

                    if( r.success )
                        return true;

                    Mojo.Log.info("TaskManager::delButFirst() r.fail");

                    // warning: it may be tempting to try to DRY this, when comparing with the AMO
                    // think first.  DRY failed twice already.

                    var e = [];

                    if( r.error )
                        e.push(r.error);

                    for(var k in r.field_errors )
                        e.push(k + "-error: " + r.field_errors[k]);

                    if( !e.length )
                        e.push("Something went wrong with the dependancy removal ...");

                    me.E("delButFirst", "rm fail", e.join("; "));

                    return false;
                }
            });
        },

        function() {
            // NOTE: if a user sees this, it will seem rather esoteric, but it
            // shouldn't come up very often.  Meh.  Users can adapt.  They'll
            // see what it relates to regardless.

            me.E("delButFirst", "search fail",
                "did not locate a dependancy as described by the two tasks given: s "
                    + parentTaskID + " depends on " + targetTaskID);
        }
    );

};

/*}}}*/

/* {{{ */ TaskManager.prototype.modifyDeps = function(pid, bf_compr, at_compr) {
    var tallies = { /* count of changes to ids, pid being the parent id of all changes */ };

    Mojo.Log.info("TaskManager::modifyDeps(%s,%s)", Object.toJSON(bf_compr), Object.toJSON(at_compr) );

    var pinc = function(x) {
        if( x in tallies )
            tallies[x] ++;

        else
            tallies[x] = 1;
    };

    var count = function(id) {
        pinc(pid); pinc(id);
    };

    bf_compr.toAdd.each(count);
    bf_compr.toDel.each(count);

    at_compr.toAdd.each(count);
    at_compr.toDel.each(count);

    Mojo.Log.info("TaskManager::modifyDeps() tallies: %s", Object.toJSON(tallies));

    var me = this;
    var pu = function(id1,id2) {
        tallies[id1]--;
        tallies[id2]--;

        Mojo.Log.info("TaskManager::modifyDeps()::pu() tallies: %s", Object.toJSON(tallies));

        if( tallies[id1] === 0 ) me.fetchOneTask(id2rl(id1),true);
        if( tallies[id2] === 0 ) me.fetchOneTask(id2rl(id2),true);
    };

    bf_compr.toAdd.each(function(id){ me.addButFirst(pid, id, pu); });
    bf_compr.toDel.each(function(id){ me.delButFirst(pid, id, pu); });

    at_compr.toAdd.each(function(id){ me.addButFirst(id, pid, pu); });
    at_compr.toDel.each(function(id){ me.delButFirst(id, pid, pu); });
};

/*}}}*/

/* {{{ */ TaskManager.prototype.getButFirstID = function(parentTaskID,targetTaskID,cb,ecb) {
    Mojo.Log.info("TaskManager::getButFirstID(%s,%s)", parentTaskID, targetTaskID);

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::getButFirstID(' + [parentTaskID,targetTaskID].join(",") + ')',
        method: 'post', url: 'http://hiveminder.com/=/action/SearchTaskDependency.json',
        params: {task_id: parentTaskID, depends_on: targetTaskID},

        cacheable: false,

        process: function(r) {
            var ret = {id: false};

            try {
                // There should be exactly one — crossing my fingers about it
                // we can always revisit this to make it more robust later if
                // necessary.

                ret.id = r.content.search[0].id;

            } catch(e) {}

            return ret;
        },

        finish: function(r) {
            Mojo.Log.info("TaskManager::getButFirstID(%s,%s)::finish() dID: %s", parentTaskID, targetTaskID, r.id);

            if( r.id ) {
                if( cb )
                    cb(r.id);

            } else {
                if( ecb )
                    ecb();
            }
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::getButFirstID(" + [parentTaskID,targetTaskID].join(",") + ") r.fail");

            // warning: it may be tempting to try to DRY this, when comparing with the AMO
            // think first.  DRY failed twice already.

            var e = [];

            if( r.error )
                e.push(r.error);

            for(var k in r.field_errors )
                e.push(k + "-error: " + r.field_errors[k]);

            if( !e.length )
                e.push("Something went wrong with the dependency search ...");

            me.E("getButFirstID", "get fail", e.join("; "));

            return false;
        }
    });
};

/*}}}*/

Mojo.Log.info('loaded(TaskManager.js)');
