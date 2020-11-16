/// <reference path="types/anyObj.d.ts" />
var app = app || {};
app.helpers = (function () {
    var helpers = {};
    helpers.removeFromArray = function (array, item) {
        var index;
        index = array.indexOf(item);
        if (index >= 0) {
            array.splice(index, 1);
        }
        return array;
    };
    helpers.unwrap = function (obj) {
        var unwrapped, key;
        if (_.isArray(obj)) {
            unwrapped = [];
            for (key = 0; key < obj.length; key++) {
                unwrapped.push(obj[key]);
            }
        }
        else {
            unwrapped = {};
            for (key in obj) {
                unwrapped[key] = obj[key];
            }
        }
        return unwrapped;
    };
    helpers.generateColor = function (seed) {
        var color;
        color = randomColor({
            luminosity: 'bright',
            seed: seed
        });
        return color;
    };
    helpers.pageReady = function ready(fn) {
        if (document.readyState != 'loading') {
            fn();
        }
        else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    };
    helpers.makeDialog = function makeDialog(options) {
        // Assumes we've got bootstrap and Vue
        var dialog, app, data;
        options = _.merge({
            components: [],
            dialogClass: '',
            notEscapable: false,
            backdrop: true,
            title: null,
            content: 'Content...',
            onOK: function () { },
            onCancel: function () { },
            buttons: null
        }, options);
        if (!options.buttons) {
            options.buttons = [{
                    text: 'OK',
                    action: options.onOK
                }, {
                    text: 'Cancel',
                    action: options.onCancel
                }];
        }
        data = {
            options: options,
            close: function (doCall) {
                dialog.parentNode.removeChild(dialog);
                document.body.classList.remove('modal-open');
                if (_.isFunction(doCall)) {
                    doCall();
                }
            },
            escape: function () {
                if (!data.options.notEscapable) {
                    data.close();
                }
            }
        };
        dialog = document.createElement('div');
        dialog.innerHTML = "\n<div class=\"modal-backdrop fade show\" v-if=\"$root.options.backdrop\"></div>\n<div class=\"modal fade show\" role=\"dialog\" tabindex=\"-1\" @keydown.esc=\"$root.escape\" @click=\"$root.escape\" style=\"display: block;\">\n  <div class=\"modal-dialog\" role=\"document\" @click.stop :class=\"$root.options.dialogClass\">\n    <div class=\"modal-content\">\n      <div class=\"modal-header\" v-if=\"$root.options.title || !$root.options.notEscapable\">\n        <h5 class=\"modal-title\" v-if=\"$root.options.title\">{{ $root.options.title }}</h5>\n        <button type=\"button\" class=\"close\" aria-label=\"Close\" v-if=\"!$root.options.notEscapable\" @click=\"$root.escape\">\n          <span aria-hidden=\"true\">&times;</span>\n        </button>\n      </div>\n      <div class=\"modal-body\">\n      " + (data.options.contentHtml ? data.options.contentHtml : "<p>{{ $root.options.content }}</p>") + "\n      </div>\n      <div class=\"modal-footer\" v-if=\"$root.options.buttons && $root.options.buttons.length > 0\">\n        <button type=\"button\" class=\"btn btn-lg flex-fill\" \n          v-for=\"(button, buttonIndex) in $root.options.buttons\"\n          :class=\"[ 'btn-' + (buttonIndex === 0 ? 'primary' : 'secondary') ]\"\n          @click=\"$root.close(button.action)\">\n          {{ button.text }}\n        </button>\n      </div>\n    </div>\n  </div>\n</div>\n";
        app = Vue.createApp({
            data: function () { return data; }
        });
        _.forEach(data.options.vueComponents, function (component, key) {
            app.component(key, component);
        });
        app.mount(dialog);
        document.body.appendChild(dialog);
        document.body.classList.add('modal-open');
        dialog.getElementsByClassName('modal')[0].focus();
    };
    helpers.copyTextToClipboard = function (text) {
        var textArea = document.createElement("textarea");
        //
        // *** This styling is an extra step which is likely not required. ***
        //
        // Why is it here? To ensure:
        // 1. the element is able to have focus and selection.
        // 2. if element was to flash render it has minimal visual impact.
        // 3. less flakyness with selection and copying which **might** occur if
        //    the textarea element is not visible.
        //
        // The likelihood is the element won't even render, not even a
        // flash, so some of these are just precautions. However in
        // Internet Explorer the element is visible whilst the popup
        // box asking the user for permission for the web page to
        // copy to the clipboard.
        //
        // Place in top-left corner of screen regardless of scroll position.
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        // Ensure it has a small width and height. Setting to 1px / 1em
        // doesn't work as this gives a negative w/h on some browsers.
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        // We don't need padding, reducing the size if it does flash render.
        textArea.style.padding = '0';
        // Clean up any borders.
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        // Avoid flash of white box if rendered for any reason.
        textArea.style.background = 'transparent';
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
        }
        catch (err) {
            console.log('Oops, unable to copy');
        }
        document.body.removeChild(textArea);
    };
    return helpers;
})();
