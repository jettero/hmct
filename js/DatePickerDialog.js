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
    this._datePicker.datepicker('setDate', this.model.value);
};

DatePickerDialogAssistant.prototype.pickedDate = function(dateText) {
    setTimeout(function(){ this.widget.mojo.close(); }.bind(this), 200);
    this.model.value = dateText;
    this.scene.controller.modelChanged(this.model);
};
