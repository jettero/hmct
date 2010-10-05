/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/
/*global Mojo $ Template palmGetResource OPT TMO ConfirmationDialog $A
*/

function TaskAssistant(_args) {
    this.task = _args[0];

    Mojo.Log.info("Task(%s)", this.task.record_locator);

    this.SCa = Mojo.Controller.stageController.assistant;
    this.tasksAssistant = _args[1];

    this.handleTaskChange = this.handleTaskChange.bind(this);
    this.menuSetup        = this.SCa.menuSetup.bind(this);

    this.yn = new ConfirmationDialog("Task");
    this.YN = this.yn.askYN;
}

// Templates and Resources {{{
TaskAssistant.prototype.shortTemplate = new Mojo.View.Template(palmGetResource(Mojo.appPath + "app/views/tt/task-short.html"), "task-short", Mojo.View.escapeHTMLInTemplates);
TaskAssistant.prototype.longTemplate  = new Mojo.View.Template(palmGetResource(Mojo.appPath + "app/views/tt/task-long.html"),  "task-long",  Mojo.View.escapeHTMLInTemplates);
// }}}

/* {{{ */ TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task::setup()");

    this.menuSetup();

    this.refreshModel     = { label: "Reload",  icon: 'refresh',      command: 'refresh' };
    this.editModel        = { label: "Edit",    icon: 'edit',         command: 'edit'    };
    this.commentModel     = { label: "Comment", icon: 'conversation', submenu: 'ctype'   };
    this.deleteModel      = { label: "Delete",  icon: 'delete',       command: 'delete'  };
    this.commandMenuModel = {
        label: 'Task Command Menu',
        items: [ this.refreshModel, { items: [ this.deleteModel, this.commentModel, this.editModel ] } ]
    };

    this.emailCtypeModel = { label: "Email", command: 'email-comment' };
    this.ajaxCtypeModel  = { label: "WebOS", command: 'webos-comment' };
    this.ctypeSubmenu = { label: 'Comment Type Submenu', items: [ this.emailCtypeModel, this.ajaxCtypeModel ] };
	this.controller.setupWidget('ctype', undefined, this.ctypeSubmenu);

	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass: 'no-fade'}, this.commandMenuModel);

    // comments list // -------------------------------------------------

    this.historyListAttrs = {
        listTemplate:  'misc/naked-list-container',
        emptyTemplate: 'misc/empty-list',
        itemTemplate:  'tt/task-delta',
        swipeToDelete: false
    };

    this.historyListModel = {listTitle: 'Task History', items: ['...']};
    this.controller.setupWidget('hm_task_history', this.historyListAttrs, this.historyListModel);

    // misc

    this.controller.get("id").update(this.task.record_locator);

    Mojo.Log.info("Task::setup() [complete]");

    this.firstActivation = true;
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.handleTaskChange = function(task) {
    Mojo.Log.info("Task::handleTaskChange(%s)", task.record_locator);

    this.task = task; // This is probably always the same exact task over and over?
                     // The assignment shouldn't cost much.

    this.controller.get("task-snl").update(
        this.shortTemplate.evaluate(task) + this.longTemplate.evaluate(task)
    );

    var rl = this.task.record_locator;

    this.controller.get("task-snl").select(".and-then").each(function(x){
        x.setAttribute("x-mojo-tap-highlight", 'momentary');
        x.addClassName("palm-row");
        x.observe('click', function(){
            TMO.searchTasks("not hidden forever not complete but first " + rl);
            Mojo.Controller.stageController.popScene();
        });
    });

    this.controller.get("task-snl").select(".but-first").each(function(x){
        x.setAttribute("x-mojo-tap-highlight", 'momentary');
        x.addClassName("palm-row");
        x.observe('click', function(){
            TMO.searchTasks("not hidden forever not complete and then " + rl);
            Mojo.Controller.stageController.popScene();
        });
    });

    this.historyListModel.items = task.comments ? task.comments : [];
    this.controller.modelChanged(this.historyListModel);

    if( OPT._preEditTask )
        this.SCa.showScene("EditTask", this.task);
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task::activate()");

    if( this.firstActivation ) {
        this.startCompressor("task");
        this.startCompressor("history");

        // force a click on some of the compressors:

        for(var i=0; i<OPT.unfoldTaskCompressors.length; i++)
           this.clickCollapsibleList( this.controller.get('compressible-' + OPT.unfoldTaskCompressors[i]),
               OPT.unfoldTaskCompressors[i] );

        // make the empty-list template show up on the initial load
        this.historyListModel.items=[]; this.controller.modelChanged(this.historyListModel);

        this.firstActivation = false;
    }

    TMO.registerTaskChange(this.handleTaskChange, this.task);
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.deactivate = function() {
    Mojo.Log.info("Task::deactivate()");

    TMO.unregisterTaskChange(this.handleTaskChange, this.task);
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.startCompressor = function(category) {
    Mojo.Log.info("Task::startCompressor(%s)", category);

    var compressible = this.controller.get('compressible-' + category);
    var compress     = this.controller.get('compress-'     + category);

    compress.addClassName('compressor');
    compress.compressorID = category;

    var me = this;
    this.controller.listen(compress, Mojo.Event.tap, function(e) {
        Mojo.Log.info("Task::startCompressor() lambda:[tap event for: %s]", category);
        me.clickCollapsibleList(compressible, category); });

    compressible.hide();
};

/*}}}*/
/* {{{ */ TaskAssistant.prototype.clickCollapsibleList = function(compressible, category) {
    Mojo.Log.info("Task::clickCollapsibleList()");

    var targetRow = this.controller.get(category + "-sit");

    if (targetRow) {
        compressible.show(); // show immediately or getHeight() is mysteriously off by 76px ...

        var toggleButton    = targetRow.down("div.arrow_button");
        var showContents    = toggleButton.hasClassName('palm-arrow-closed');
        var maxHeight       = compressible.getHeight();

        var options = {
            curve:      'over-easy',
            from:       1,
            to:         maxHeight,
            duration:   0.4
        };

        if (showContents) {
            toggleButton.addClassName('palm-arrow-expanded');
            toggleButton.removeClassName('palm-arrow-closed');
            compressible.setStyle({ height: '1px' });

            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
            };

        } else {
            toggleButton.addClassName('palm-arrow-closed');
            toggleButton.removeClassName('palm-arrow-expanded');

            compressible.setStyle({ height: maxHeight + 'px' });

            options.reverse    = true;
            options.onComplete = function(e) {
                compressible.setStyle({height: 'auto'});
                compressible.hide();
            };
        }

        Mojo.Animation.animateStyle(compressible, 'height', 'bezier', options);
    }
};

/*}}}*/

/* {{{ */ TaskAssistant.prototype.handleCommand = function(event) { var rl = this.task.record_locator;
    Mojo.Log.info("Task::handleCommand() [rl=%s]", rl);

    if (event.type === Mojo.Event.command) {
        var s_a = event.command.split(/\s*(?:@@)\s*/);

        if( s_a.length > 0 )
            Mojo.Log.info("Task::handleCommand(%s) [rl=%s]", s_a[0], rl);

        switch (s_a[0]) {
            case 'refresh':
                TMO.fetchOneTask(rl, true); // force reload
                break;

            case 'edit':
                this.SCa.showScene("EditTask", this.task);
                break;

            case 'delete':
                this.YN("handleCommand", 'delete', "Delete this task?", function(v){
                    Mojo.Log.info("Task::handleCommand(delete) [rl=%s] v=%s", rl, v);

                    if(v !== "yes")
                        return;

                    // this marks the cache "stale" automatically
                    TMO.deleteTask(this.task, function() {
                        Mojo.Log.info("Task::handleCommand(delete) [rl=%s] [delete completed updating list-model]", rl);

                        try {
                            this.tasksAssistant.tasksListModel.items =
                                $A(this.tasksAssistant.tasksListModel.items).reject(
                                    function(i) { return i === this.task; }.bind(this) );

                            this.tasksAssistant.controller.modelChanged(this.tasksAssistant.tasksListModel);

                        } catch(e) {
                            Mojo.Log.info("Task::handleCommand(delete) [delete-cb] [rl=%s] js-ERROR: %s",
                                this.task.record_locator, e);
                        }

                    }.bind(this));

                    // then go back, cuz this task is gone
                    Mojo.Controller.stageController.popScene();

                }.bind(this));
                break;

            case 'email-comment':
                var subject = "Comment: " + this.task.summary + " (#" + rl + ")";
                var url     = 'http://task.hm/' + rl;
                var msg     = "<p> → Go to <a href='" + url + "'>" + this.task.summary + "</a> (#" + rl + ")";

                this.controller.serviceRequest("palm://com.palm.applicationManager", {
                        method: 'open',
                        parameters: {
                            id: "com.palm.app.email",
                            params: {
                                summary: subject, text: msg, recipients: [{
                                    type:  "email",
                                    role:  1, /* 1-to, 2-cc, 3-bcc */
                                    value: this.task.comment_address,
                                    contactDisplay: "Task-" + rl
                                }]
                            }
                        }
                    }
                );
                break;

            case 'webos-comment':
                var FCA = new FastCommentAssistant(this, function(comment){
                    Mojo.Log.info("Task::handleCommand(webos-comment) [rl=%s]", rl);
                    TMO.commentTask(this.task, comment);

                }.bind(this));

                var dialogObject = this.controller.showDialog({ template: 'misc/fast-comment', assistant: FCA });
                FCA.mojo = dialogObject.mojo;
                break;

            default:
                Mojo.Log.info("Task::handleCommand(unknown command: %s) [rl=%s]", Object.toJSON(s_a), rl);
                break;
        }
    }

};

/*}}}*/

Mojo.Log.info('loaded(Task.js)');
