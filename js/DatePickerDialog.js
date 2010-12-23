/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/

function DatePickerDialogAssistant(_sa,_m) {
    Mojo.Log.info("DatePicker()");

    this.scene = _sa;
    this.model = _m;

    this.pickedDate = this.pickedDate.bind(this);
}

DatePickerDialogAssistant.prototype.setup = function(_w) {
    this.widget = _w;
};

DatePickerDialogAssistant.prototype.activate = function() {
    Mojo.Log.info("DatePicker::activate()");

    this._datePicker = jQuery('#date-picker').datepicker({ inline: true, onSelect: this.pickedDate });
    if( this.model.value )
         this._datePicker.datepicker('setDate', new Date(this.model.value));
    else this._datePicker.datepicker('setDate', new Date());
};

DatePickerDialogAssistant.prototype.pickedDate = function(dateText) {
    setTimeout(function(){ this.widget.mojo.close(); }.bind(this), 200);

    var d = new Date(dateText);
    var curr_date  = d.getDate();
    var curr_month = d.getMonth();
    var curr_year  = d.getFullYear();

    curr_month ++; // month is 0-11 in this goofy object

    this.model.value = [curr_year, curr_month, curr_date].join("-").replace(/-(\d)-/, "-0$1-").replace(/-(\d)$/, "-0$1");
    this.scene.controller.modelChanged(this.model);
};
