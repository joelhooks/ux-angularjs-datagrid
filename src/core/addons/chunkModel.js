/**
 * ###chunkModel###
 * Because the browser has low performance on dom elements that exist in high numbers and are all
 * siblings chunking is used to break them up into limits of their number and their parents and so on.
 * So think of it as every chunk not having more than X number of children weather those children be
 * chunks or they be rows.
 *
 * This speeds up the browser significantly because a resize event from a dom element will not affect
 * all of them, but just those direct siblings and then it's parents siblings and so on up the chain.
 *
 * @param {ux.datagrid} inst
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(inst) {

    var _list, _rows, _chunkSize, _el, result = exports.logWrapper('chunkModel', {}, 'purple', inst.dispatch);

    /**
     * **getChunkList**
     * Return the list that was created.
     * @returns {ChunkArray}
     */
    function getChunkList() {
        return _list;
    }

    /**
     * Create a ChunkArray from the array of data that is passed.
     * The array that is passed should not be multi-dimensional. This will only work with a single
     * dimensional array.
     * @param {Array} list
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @returns {ChunkArray}
     */
    function chunkList(list, size, templateStart, templateEnd) {
        var i = 0, len = list.length, result = new ChunkArray(), childAry, item;
        while (i < len) {
            item = list[i];
            if (i % size === 0) {
                if (childAry) {
                    calculateHeight(childAry);
                }
                childAry = new ChunkArray();
                childAry.min = item.min || i;
                childAry.templateModel = inst.templateModel;
                childAry.templateStart = templateStart;
                childAry.templateEnd = templateEnd;
                childAry.parent = result;
                childAry.index = result.length;
                result.push(childAry);
            }
            if (item instanceof ChunkArray) {
                item.parent = childAry;
            }
            childAry.push(item);
            childAry.max = item.max || i;
            i += 1;
        }
        if (childAry) calculateHeight(childAry);
        if (!result.min) {
            result.min = result[0] ? result[0].min : 0;
            result.max = result[result.length - 1] ? result[result.length - 1].max : 0;
            result.templateStart = templateStart;
            result.templateEnd = templateEnd;
            calculateHeight(result);
            result.dirtyHeight = false;
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }

    /**
     * Using a ChunkArray calculate the heights of each array recursively.
     * @param ary {ChunkArray}
     */
    function calculateHeight(ary) {
        ary.updateHeight(inst.templateModel, _rows);
        if (!ary.rendered) {
            ary.templateStart = ary.templateStart.substr(0, ary.templateStart.length - 1) + ' style="width:100%;height:' + ary.height + 'px;">';
        }
    }

    /**
     * ###<a name="updateAllChunkHeights">updateAllChunkHeights</a>###
     * Go through each of the chunks affected by the row index and range and update their heights.
     * It starts as that bottom chunk and moves up. So all parents get updated when that row changes.
     * @param {Number} rowIndex
     * @param {Number=} range
     */
    function updateAllChunkHeights(rowIndex, range) {
        var indexes, ary, allIndexes, i = 0, len, j, jLen, merged;
        if (range !== undefined) {
            //TODO: unit test needed.
            _list.forceHeightReCalc(inst.templateModel, _rows);
            updateChunkHeights(_el, _list);
        }
        indexes = getRowIndexes(rowIndex, _list);
        ary = getArrayFromIndexes(indexes, _list);
        updateChunkArrayHeights(ary, indexes);
    }

    function updateChunkArrayHeights(ary, indexes) {
        ary.updateHeight(inst.templateModel, _rows);
        updateChunkHeights(_el, _list, indexes);
    }

    function updateChunkHeights(el, ary) {
        el = el[0] || el;
        var i = 0, len = ary.length, children = el.childNodes;
        while (i < len) {
            if (children.length && updateChunkStyle(children[i], ary[i])) {
                updateChunkHeights(children[i], ary[i]);
            }
            i += 1;
        }
        updateChunkStyle(el, ary);
    }

    function updateChunkStyle(el, chunk) {
        if (chunk.dirtyHeight) {
            chunk.dirtyHeight = false;
            el.style.height = chunk.height + 'px';
            return true;
        }
        return false;
    }

    function getArrayFromIndexes(indexes, ary) {
        var index;
        while (indexes.length) {
            index = indexes.shift();
            if (ary[index] instanceof ChunkArray) {
                ary = ary[index];
            }
        }
        return ary;
    }

    /**
     * Create the chunkList so that it is ready for dom. Set properties needed to create the dom.
     * The dom gets created when the rows are accessed.
     * @param {Array} list // single dimensional array only.
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @param {DomElement} el
     * @returns {DomElement}
     */
    function chunkDom(list, size, templateStart, templateEnd, el) {
        result.log('chunkDom');
        _el = el;
        _chunkSize = size;
        _rows = list;
        _list = chunkList(list, size, templateStart, templateEnd);
        return el;
    }

    /**
     * Generate an array of indexes that point to that row.
     * @param rowIndex
     * @param chunkList
     * @param indexes
     * @returns {Array}
     */
    function getRowIndexes(rowIndex, chunkList, indexes) {
        var i = 0, len = chunkList.length, chunk;
        indexes = indexes || [];
        while (i < len) {
            chunk = chunkList[i];
            if (chunk instanceof ChunkArray) {
                if (rowIndex >= chunk.min && rowIndex <= chunk.max) {
                    indexes.push(i);
                    getRowIndexes(rowIndex, chunk, indexes);
                    break;
                }
            } else { // we are at the end. So we just need the last index.
                indexes.push(rowIndex % _chunkSize);
                break;
            }
            i += 1;
        }
        return indexes;
    }

    /**
     * Get the dom row element.
     * @param rowIndex {Number}
     * @returns {*}
     */
    function getRow(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list);
        return buildDomByIndexes(indexes);
    }

    /**
     * Get the domElement by indexes, create the dom if it doesn't exist.
     * @param indexes {Number}
     * @returns {*}
     */
    function buildDomByIndexes(indexes) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el, children;
        while (i < indxs.length) {
            index = indxs.shift();
            if (!ca.rendered) {
                el.html(ca.getChildrenStr());
                children = el.children();
                exports.each(children, computeStyles);
                if (children[0].className.indexOf(inst.options.chunkClass) !== -1) {
                    // need to calculate css styles before adding this class to make transitions work.
                    children.addClass(inst.options.chunkReadyClass);
                }
            }
            ca = ca[index];
            el = angular.element(el.children()[index]);
        }
        return el;
    }

    /**
     * ##<a name="computedStyles">computedStyles</a>##
     * calculate the computed styles of each element
     */
    function computeStyles(elm) {
        window.getComputedStyle(elm).getPropertyValue('top');
    }

    /**
     * Remove all dom, and all other references.
     */
    function reset() {
        result.log("reset");
        //TODO: this needs to make sure it destroys things properly
        if (_list) _list.destroy();
        _rows = null;
        _list = null;
        _chunkSize = null;
        _el = null;
    }

    function destroy() {
        reset();
        result.destroyLogger();
    }

    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function (rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getRow = getRow;
    result.reset = reset;
    result.updateAllChunkHeights = updateAllChunkHeights;
    result.destroy = destroy;

    // apply event dispatching.
    dispatcher(result);

    inst.chunkModel = result;
    return result;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);

/**
 * ####ChunkArray####
 * is an array with additional properties needed by the chunkModel to generate and access chunks
 * of the dom with high performance.
 * @constructor
 */
var ChunkArray = function () {
};
ChunkArray.prototype = [];
ChunkArray.prototype.min = 0;
ChunkArray.prototype.max = 0;
ChunkArray.prototype.templateStart = '';
ChunkArray.prototype.templateEnd = '';
ChunkArray.prototype.getStub = function getStub(str) {
    return this.templateStart + str + this.templateEnd;
};
/**
 * **ChunkArray.prototype.getChildStr**
 * Get the HTML string representation of the children in this array.
 * If deep then return this and all children down.
 * @param deep
 * @returns {string}
 */
ChunkArray.prototype.getChildrenStr = function (deep) {
    var i = 0, len = this.length, str = '', ca = this;
    while (i < len) {
        if (ca[i] instanceof ChunkArray) {
            str += ca[i].getStub(deep ? ca[i].getChildrenStr(deep) : '');
        } else {
            str += this.templateModel.getTemplate(ca[i]).template;
        }
        i += 1;
    }
    this.rendered = true;
    return str;
};
ChunkArray.prototype.updateHeight = function (templateModel, _rows) {
    var i = 0, len, height = 0;
    if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            height += this[i].height;
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.dirtyHeight = true;
    }
    this.height = height;
    if (this.dirtyHeight) {
        if (this.parent) this.parent.updateHeight(templateModel, _rows);
    }
};
ChunkArray.prototype.forceHeightReCalc = function (templateModel, _rows) {
    var i = 0, len, height = 0;
        if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            height += this[i].forceHeightReCalc(templateModel, _rows);
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
//        console.log('forceHeightReCalc %s from %s to %s', this.getId(), this.height, height);
        this.height = height;
        this.setDirtyHeight();
    }
    return this.height;
};
ChunkArray.prototype.setDirtyHeight = function () {
    var p = this;
    while (p) {
        p.dirtyHeight = true;
        p = p.parent;
    }
};
ChunkArray.prototype.getId = function () {
    if (!this._id) {
        var p = this, s = '';
        while (p) {
            s = '.' + (p.index || '0') + s;
            p = p.parent;
        }
        this._id = s.substr(1, s.length);
    }
    return this._id;
};
/**
 * Perform proper cleanup.
 */
ChunkArray.prototype.destroy = function () {
    this.templateStart = '';
    this.templateEnd = '';
    this.templateModel = null;
    this.rendered = false;
    this.parent = null;
    this.length = 0;
};