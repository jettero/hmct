/*jslint white: false, onevar: false, maxerr: 500000, regexp: false
*/

function DatePickerDialogAssistant(_sa,_cb) {
    Mojo.Log.info("DatePicker()");

    this.sceneAssistant = _sa;
    this.pickedDate     = _cb || function() {};
}

DatePickerDialogAssistant.prototype.activate = function() {
    Mojo.Log.info("DatePicker::activate()");

    this._datePicker = jQuery('#date-picker').datepicker({ inline: true });
};


