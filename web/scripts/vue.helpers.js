var app = app || {};
app.vueHelpers = (function () {
    var helpers = {};
    helpers.directives = {
        getDefault: function () {
            var directives = {};
            directives['focus'] = {
                mounted: function (element) { element.focus(); }
            };
            directives['touch-highlight'] = {
                mounted: function (element) {
                    var highlightElement = null, timeoutHandle = null;
                    function removeHighlight() {
                        if (highlightElement !== null) {
                            highlightElement.parentNode.removeChild(highlightElement);
                            highlightElement = null;
                        }
                        if (timeoutHandle !== null) {
                            clearTimeout(timeoutHandle);
                            timeoutHandle = null;
                        }
                    }
                    function onTouchEvent(event) {
                        var touch = event.touches[0] || event.changedTouches[0], target, boundingRect;
                        target = document.elementFromPoint(touch.pageX, touch.pageY);
                        // target = <HTMLElement>touch.target;
                        boundingRect = target.getBoundingClientRect();
                        removeHighlight();
                        highlightElement = document.createElement('div');
                        highlightElement.className = 'touch__highlight__element';
                        document.body.appendChild(highlightElement);
                        _.merge(highlightElement.style, {
                            position: 'fixed',
                            top: boundingRect.top + (boundingRect.height / 2) + 'px',
                            left: boundingRect.left + (boundingRect.width / 2) + 'px',
                            transform: 'translate(-50%,-50%)',
                            zIndex: 9999,
                            pointerEvents: 'none'
                        });
                        _.merge(highlightElement.style, {
                            border: '4px solid #E74C3C',
                            width: (boundingRect.width * 2) + 'px',
                            height: (boundingRect.height * 2) + 'px',
                            borderRadius: '50%'
                        });
                        timeoutHandle = setTimeout(removeHighlight, 2500);
                    }
                    element.addEventListener('touchstart', onTouchEvent);
                    element.addEventListener('touchmove', onTouchEvent);
                    element.addEventListener('touchend', removeHighlight);
                },
                unmounted: function (element) {
                    element.removeEventListener('touchstart', null);
                    element.removeEventListener('touchmove', null);
                    element.removeEventListener('touchend', null);
                }
            };
            var storedMovementLocations = {};
            directives['move-when-mounted'] = {
                mounted: function (element, binding) {
                    var previousItem = storedMovementLocations[binding.value.key], previous = previousItem ? previousItem.rect : null, current = element.getBoundingClientRect(), style;
                    if (previous) {
                        style = window.getComputedStyle(element);
                        // Let's translate from A to B
                        element.style.transform = "translate(" + (previous.left - current.left) + "px," + (previous.top - current.top) + "px) " + style.transform;
                        Vue.nextTick(function () {
                            element.style.transition = "transform 0.5s ease-in-out";
                            element.style.transform = null;
                            setTimeout(function () {
                                element.style.transition = null;
                            }, 500);
                        });
                    }
                    storedMovementLocations[binding.value.key] = {
                        rect: current
                    };
                },
                updated: function (element, binding) {
                    if (binding.value.ignoreUpdate)
                        return;
                    directives['move-when-mounted'].mounted(element, binding);
                },
                beforeUnmount: function (element, binding) {
                    storedMovementLocations[binding.value.key] = {
                        rect: element.getBoundingClientRect()
                    };
                }
            };
            return directives;
        },
        applyDefault: function (vueApp) {
            _.forEach(helpers.directives.getDefault(), function (directive, key) {
                vueApp.directive(key, directive);
            });
        }
    };
    helpers.components = {
        getDefault: function () {
            var components = {};
            components['player-avatar'] = {
                props: ['player', 'customize'],
                template: "\n<i v-if=\"player.metadata.avatar.type=='css-class'\"\n    :class=\"player.metadata.avatar.value\"\n    :style=\"{ 'color': player.metadata.color }\"></i>\n    \n<div v-else-if=\"player.metadata.avatar.type=='piece'\"\n    class=\"avatar__piece-wrap\"\n    :class=\"{ 'avatar__piece-wrap--customizable': customize }\"\n    v-on=\"customize ? { \n        'click': $root.customization.domEvents.pieceClick,\n        'mousedown': $root.customization.domEvents.pieceDrag,\n        'mousemove': $root.customization.domEvents.pieceDrag,\n        'wheel': $root.customization.domEvents.pieceWheel\n    } : {}\">\n    \n    <div class=\"avatar__piece-piece\"\n        :style=\"{ \n            'background-image': 'url(' + player.metadata.avatar.value.piece.url + ')' \n        }\"></div>\n        \n    <div class=\"avatar__piece-piece-mask\"\n        :style=\"{ \n            'mask-image': 'url(' + player.metadata.avatar.value.piece.url + ')',\n            '-webkit-mask-image': 'url(' + player.metadata.avatar.value.piece.url + ')',\n            'background-color': player.metadata.color,\n            'opacity': 0.5\n        }\"></div>\n        \n    <div class=\"avatar__piece-face\"\n        v-if=\"player.metadata.avatar.value.face\"\n        :style=\"{ \n            'background-image': 'url(' + player.metadata.avatar.value.face.url + ')',\n            'top': player.metadata.avatar.value.face.top,\n            'left': player.metadata.avatar.value.face.left,\n            'width': player.metadata.avatar.value.face.width,\n            'height': player.metadata.avatar.value.face.height\n        }\"></div>\n        \n    <div class=\"avatar__piece-accessory\"\n        v-if=\"player.metadata.avatar.value.accessory\"\n        :style=\"{ \n            'background-image': 'url(' + player.metadata.avatar.value.accessory.url + ')',\n            'top': player.metadata.avatar.value.accessory.top,\n            'left': player.metadata.avatar.value.accessory.left,\n            'width': player.metadata.avatar.value.accessory.width,\n            'height': player.metadata.avatar.value.accessory.height\n        }\"></div>\n</div>\n\n<i v-else class=\"fas fa-question\"\n    :style=\"{ 'color': player.metadata.color }\"></i>"
            };
            // Borrowed from https://codepen.io/square0225/pen/QdvLQg
            components['fill-circle'] = {
                props: ['percent', 'color'],
                template: "\n<svg viewBox=\"0 0 100 100\" height=\"1em\" style=\"height: 100%; transform: rotate(-90deg); border-radius: 50%; fill: none; stroke-width: 100%;\"\n    :style=\"{ 'stroke': color || '#7f8c8d', 'stroke-dasharray': ((Math.min(Math.max(percent,0),100) || 0) * Math.PI) + ', 999' }\">\n    <circle cx=\"50\" cy=\"50\" r=\"50\"></circle>  \n</svg>"
            };
            return components;
        },
        applyDefault: function (vueApp) {
            _.forEach(helpers.components.getDefault(), function (component, key) {
                vueApp.component(key, component);
            });
        }
    };
    return helpers;
})();
