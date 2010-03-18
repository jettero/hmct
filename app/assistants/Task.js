/*jslint white: false, onevar: false
*/
/*global Mojo $ setTimeout
*/

function TaskAssistant(_i) {
    Mojo.Log.info("Task(%s)", (this.item = _i).record_locator);

    this.moveElementIntoDividers  = this.moveElementIntoDividers.bind(this);
    this.moveElementOutOfDividers = this.moveElementOutOfDividers.bind(this);
    this.clickCollapsibleList     = this.clickCollapsibleList.bind(this);
}

TaskAssistant.prototype.setup = function() {
    Mojo.Log.info("Task()::setup()");

    $("id").update(this.item.record_locator);

    this.tasksListAttrs = {
        dividerFunction: function(mi) { return mi.category; },
        dividerTemplate: 'misc/li-task-div',
        listTemplate:    'misc/naked-list-container',
        emptyTemplate:   'misc/empty-list',
        itemTemplate:    'misc/li-task-row',
        swipeToDelete:   false
    };

    this.tasksListModel = {listTitle: 'Hiveminder Tasks', items: [

        {id: 1, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 2, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 3, row_name: "test", category: "blarg", row_data: "test test test test"},
        {id: 4, row_name: "test", category: "blarg", row_data: "test test test test"},
             
        {id: 5, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 6, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 7, row_name: "test", category: "gralb", row_data: "test test test test"},
        {id: 8, row_name: "test", category: "gralb", row_data: "test test test test"}

    ]};

    this.controller.setupWidget('hm_task_list', this.tasksListAttrs, this.tasksListModel);
};

TaskAssistant.prototype.activate = function() {
    Mojo.Log.info("Task()::activate()");
    var hrm = {blarg: true, gralb: true};
    var me  = this;
    
    for(var k in hrm) {
        var compress     = this.controller.get('compress'     + k);
        var compressable = this.controller.get('compressable' + k).hide();

        compress.addClassName('compressor');
        compress.compressorID = k;

        this.controller.listen(compress, Mojo.Event.tap, this.clickCollapsibleList);
        this.getElementsOfCategory(k).each(this.moveElementsIntoDividers);
    }
};

TaskAssistant.prototype.getElementsOfCategory = function(category) {
    Mojo.Log.info("Task()::getElementsOfCategory(%s)", category);

    return this.tasksListModel.items.findAll(function(i){ return i.category === category; });
};

TaskAssistant.prototype.moveElementIntoDividers = function(item) {
    Mojo.Log.info("Task()::moveElementsIntoDividers()");

    var compressable = this.controller.get('compressable' + item.category);
        compressable.insert(this.controller.get('element' + item.id));

    this.controller.get('element' + item.id).show();
};

TaskAssistant.prototype.moveElementOutOfDividers = function(item) {
    Mojo.Log.info("Task()::moveElementsOutOfDividers()");

    this.controller.get('element_holder' + item.id).insert(this.controller.get('element' + item.id));
};

TaskAssistant.prototype.clickCollapsibleList = function(drawer, category, event) {
    Mojo.Log.info("Task()::clickCollapsibleList()");

    var targetRow = this.controller.get(event.target);
    if (!targetRow.hasClassName("selection_target")) {
        Mojo.Log.info("Task()::clickCollapsibleList() !selection_target" );
        targetRow = targetRow.up('.selection_target');
    }        

    if (targetRow) {
        var toggleButton   = targetRow.down("div.arrow_button");
        var viewPortMidway = this.controller.window.innerHeight;
        var noScroll       = false;

        if (!toggleButton.hasClassName('palm-arrow-expanded') && !toggleButton.hasClassName('palm-arrow-closed'))
            return;

        var show = toggleButton.className;
        Mojo.Log.info("Task()::clickCollapsibleList() open/close [className: %s]", show);

        if (!targetRow.hasClassName("details"))
            return;

        var categoryItems   = this.tasksListModel.items.findAll(function(i){ return i.category === category; });
        var showFavorites   = toggleButton.hasClassName('palm-arrow-closed');
        var folderContainer = targetRow.down('.collapsor');
        var maxHeight       = folderContainer.getHeight();

        Mojo.Log.info("here1");

        if (showFavorites) {
            toggleButton.addClassName('palm-arrow-expanded');
            toggleButton.removeClassName('palm-arrow-closed');
            folderContainer.setStyle({ height:'1px' });
            folderContainer.show();

            // See if the div should scroll up a little to show the contents
            var elementTop = folderContainer.viewportOffset().top;
            var scroller = Mojo.View.getScrollerForElement(folderContainer);
            if (elementTop > viewPortMidway && scroller && !noScroll) {
                //Using setTimeout to give the animation time enough to give the div enough height to scroll to
                var scrollToPos = scroller.mojo.getScrollPosition().top - (elementTop - viewPortMidway);
                setTimeout(function() {scroller.mojo.scrollTo(undefined, scrollToPos, true);}, 200);
            }

        } else {
            folderContainer.setStyle({ height: maxHeight + 'px' });
            toggleButton.addClassName('palm-arrow-closed');
            toggleButton.removeClassName('palm-arrow-expanded');
            categoryItems.each(this.moveElementsIntoDividers);
        }

        var me   = this;
        var accb = function(d,c,e) { me.animationComplete(d, c, e, showFavorites, categoryItems, folderContainer); };

        var options = {
            reverse:    !showFavorites,
            onComplete: accb,
            curve:      'over-easy',
            from:       1,
            to:         maxHeight,
            duration:   0.4
        };

        Mojo.Animation.animateStyle(folderContainer, 'height', 'bezier', options);
    }
};

TaskAssistant.prototype.animationComplete = function(drawer, category, event, showFavorites, categoryItems, folderContainer) {
    Mojo.Log.info("Task()::animationComplete(%s)", category);

    if (!showFavorites) {
        folderContainer.hide();

    } else {
        categoryItems.each(this.moveElementsOutOfDividers);
    }

    folderContainer.setStyle({height:'auto'});
};
