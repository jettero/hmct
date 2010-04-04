/*jslint white: false, onevar: false, maxerr: 500000
*/
/*global Mojo AMO REQ Template OPT setTimeout
*/

/* {{{ */ function TaskManager() {
    Mojo.Log.info("TaskManager()");

    this.handleLoginChange = this.handleLoginChange.bind(this);

    AMO.registerLoginChange(this.handleLoginChange);

    this.tasksChangeCallback = [];
    this.taskChangeCallback = {};
}

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
/* {{{ */ TaskManager.prototype.searchTasks = function(search,force) {
    if( !search ) {
        if( !this.lastSearch ) {
            search = OPT.defaultSearch;

        } else {
            search = this.lastSearch;
        }
    }

    Mojo.Log.info("TaskManager::searchTasks(%s,[%s])", search, force ? "force" : "cache ok");

    var me = this;

    REQ.doRequest({
          desc: 'TaskManager::searchTasks()',
        method: 'post', url: 'http://hiveminder.com/=/action/DownloadTasks.json',
        params: {format: 'json', query: (this.lastSearch = search).replace(/\s+/g, "/")},

        force: force,
        cacheable: true,
        keyStrings: [this.currentLogin, search],

        process: function(r) {
            var currentTime = (new Date());
            var month = currentTime.getMonth() + 1;
            var day   = currentTime.getDate();
            var year  = currentTime.getFullYear();
            var now   = (year + " " + month + " " + day).replace(/ /g, "0");

            return me.fixutf8( r.content.result ).evalJSON().each(function(t){
                if( t.due ) {
                    var d = t.due.replace(/\D+/g, "");
                    t.due_class = now>d ? "overdue" : "regular-due";

                } else {
                    t.due_class = "not-due";
                }

            });
        },

        finish:  function(r) {
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
        method: 'post', url: 'http://hiveminder.com/=/action/SearchTaskEmail.json',
        params: {task_id: task.id},

        cacheable: true,
        keyStrings: [this.currentLogin, 'getComments', rl],
        cacheMaxAgeOverride: task._req_cacheAge, // we're rarely going to be intersted in comments older than the task

        process: function(r) { // this is a new success result
            var ret = [];
            var header,matches,newMessage;

            r.content.search.each(function(c){
                // 0 is the whole match, 1 is the first group, etc
                if( matches = c.message.match(/^((?:.|\n)+?)\n\n((?:.|\n)+)/) ) {
                    if( matches[2].match(/\S+/) ) {
                        newMessage = { message: matches[2] };

                        if( header = matches[1].match(/^Subject:\s+(.+)$/im) )
                             newMessage.subj = header[1];
                        else newMessage.subj_class = "no-subject";

                        if( header = matches[1].match(/^From:\s+(.+)$/im) )
                             newMessage.from = header[1];
                        else newMessage.from_class = "no-sender";

                        if( header = matches[1].match(/^Date:\s+(.+)$/im) )
                             newMessage.when = header[1];
                        else newMessage.when_class = "no-date";

                        ret.push(newMessage);
                    }
                }
            });

            return ret;
        },

        finish: function(r) {
            task.comments = r;
            me.notifyTaskChange(task);
        },

        success: function(r) {
            if( r.success )
                return true;

            Mojo.Log.info("TaskManager::getComments(%s) r.fail, r=%s", rl, Object.toJSON(r));

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
