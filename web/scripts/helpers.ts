﻿/// <reference path="types/anyObj.d.ts" />

declare var randomColor: any;
declare var Vue: anyObj;
declare var _: anyObj;

var app = app || {};

app.helpers = (function () {
    const helpers: anyObj = {};

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
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    };

    helpers.makeDialog = function makeDialog(options) {
        // Assumes we've got bootstrap and Vue
        var dialog, vueApp, data;

        options = _.merge({
            onClose: () => {},
            components: [],
            dialogClass: '',
            notEscapable: false,
            backdrop: true,
            title: null,
            content: 'Content...',
            onOK: () => {},
            onCancel: () => {},
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
                if (_.isFunction(options.onClose)) {
                    options.onClose();
                }
            },
            escape: function () {
                if (!data.options.notEscapable) {
                    data.close();
                }
            }
        };

        dialog = document.createElement('div');
        dialog.innerHTML = `
<div class="modal-backdrop fade show" v-if="$root.options.backdrop"></div>
<div class="modal fade show" role="dialog" tabindex="-1" @keydown.esc="$root.escape" @click="$root.escape" style="display: block;">
  <div class="modal-dialog" role="document" @click.stop :class="$root.options.dialogClass">
    <div class="modal-content">
      <div class="modal-header" v-if="$root.options.title || !$root.options.notEscapable">
        <h5 class="modal-title" v-if="$root.options.title">{{ $root.options.title }}</h5>
        <button type="button" class="close" aria-label="Close" v-if="!$root.options.notEscapable" @click="$root.escape">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
      ` + (data.options.contentHtml ? data.options.contentHtml : `<p>{{ $root.options.content }}</p>`) + `
      </div>
      <div class="modal-footer" v-if="$root.options.buttons && $root.options.buttons.length > 0">
        <button type="button" class="btn btn-lg flex-fill" 
          v-for="(button, buttonIndex) in $root.options.buttons"
          :class="[ 'btn-' + (buttonIndex === 0 ? 'primary' : 'secondary') ]"
          @click="$root.close(button.action)">
          {{ button.text }}
        </button>
      </div>
    </div>
  </div>
</div>
`;
        vueApp = Vue.createApp({
            data: () => data
        });
        
        _.forEach(data.options.vueComponents, function (component, key) {
            vueApp.component(key, component);
        });

        vueApp.mount(dialog);
        document.body.appendChild(dialog);
        document.body.classList.add('modal-open');
        dialog.getElementsByClassName('modal')[0].focus();
        
        app.__latestDialog = dialog;
        app.__latestDialogViewmodel = data;
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
        } catch (err) {
            console.log('Oops, unable to copy');
        }

        document.body.removeChild(textArea);
    };

    return helpers;
})();