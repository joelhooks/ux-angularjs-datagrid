/*
* uxDatagrid v.0.2.3
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/**
 * Datagrid infinite scroll adds more data when the list scrolls to the bottom.
 * @type {string}
 */
ux.datagrid.events.ON_SCROLL_TO_TOP = "datagrid:scrollToTop";

ux.datagrid.events.ON_SCROLL_TO_BOTTOM = "datagrid:scrollToBottom";

angular.module("ux").factory("infiniteScroll", function() {
    return function infiniteScroll(inst) {
        var result = {}, bottomOffset = 0, scrollOffset = 0, loadingRow = {
            _template: "loadingRow"
        };
        result.beforeDataChange = function beforeDataChange() {
            scrollOffset = inst.values.scroll;
            if (inst.data[inst.data.length - 1] !== loadingRow && (!inst.options.infiniteScrollLimit || inst.data.length < inst.options.infiniteScrollLimit)) {
                inst.data.push(loadingRow);
            }
        };
        result.calculateBottomOffset = function calculateBottomOffset() {
            if (inst.rowsLength) {
                var i = inst.rowsLength - 1;
                bottomOffset = inst.getRowOffset(i) - inst.getViewportHeight() + inst.getRowHeight(i);
                inst.scrollModel.scrollTo(scrollOffset, true);
            }
        };
        result.onUpdateScroll = function onUpdateScroll(event, scroll) {
            if (scroll >= bottomOffset) {
                inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_BOTTOM);
            } else if (scroll <= 0) {
                inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_TOP);
            }
        };
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_AFTER_DATA_CHANGE, result.beforeDataChange));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, result.calculateBottomOffset));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.SCROLL_STOP, result.onUpdateScroll));
        inst.infiniteScroll = result;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
