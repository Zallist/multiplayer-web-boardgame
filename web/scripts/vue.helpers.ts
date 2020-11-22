var app = app || {};

app.vueHelpers = (function () {
    const helpers: anyObj = {};

    helpers.directives = {
        getDefault() {
            var directives: anyObj = {};

            directives['focus'] = {
                mounted (element: HTMLElement) { element.focus() }
            };
        
            directives['touch-highlight'] = {
                mounted (element: HTMLElement) {
                    let highlightElement: HTMLElement = null,
                        timeoutHandle: number = null;
        
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
        
                    function onTouchEvent(event: TouchEvent) {
                        let touch: Touch = event.touches[0] || event.changedTouches[0],
                            target: HTMLElement,
                            boundingRect: DOMRect;
        
                        target = <HTMLElement>document.elementFromPoint(touch.pageX, touch.pageY);
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
                unmounted (element: HTMLElement) {
                    element.removeEventListener('touchstart', null);
                    element.removeEventListener('touchmove', null);
                    element.removeEventListener('touchend', null);
                }
            };

            let storedMovementLocations: anyObj = {};

            directives['move-when-mounted'] = {
                mounted (element: HTMLElement, binding: anyObj) {
                    let previousItem = storedMovementLocations[binding.value.key],
                        previous = previousItem ? previousItem.rect : null,
                        current = element.getBoundingClientRect(),
                        style: CSSStyleDeclaration;

                    if (previous) {
                        style = window.getComputedStyle(element);

                        // Let's translate from A to B
                        element.style.transform = `translate(${previous.left - current.left}px,${previous.top - current.top}px) ${style.transform}`;
                        
                        Vue.nextTick(() => {
                            element.style.transition = `transform 0.5s ease-in-out`;
                            element.style.transform = null; 

                            setTimeout(() => {
                                element.style.transition = null;
                            }, 500);
                        });
                    }

                    storedMovementLocations[binding.value.key] = {
                        rect: current
                    };
                },
                updated (element: HTMLElement, binding: anyObj) {
                    directives['move-when-mounted'].mounted(element, binding);
                },
                beforeUnmount (element: HTMLElement, binding: anyObj) {
                    storedMovementLocations[binding.value.key] = {
                        rect: element.getBoundingClientRect()
                    };
                }
            }
        
            return directives;
        },

        applyDefault(vueApp) {
            _.forEach(helpers.directives.getDefault(), (directive: any, key: string) => {
                vueApp.directive(key, directive);
            });
        }
    };

    helpers.components = {
        getDefault() {
            var components: anyObj = {};


            components['player-avatar'] = {
                props: ['player', 'customize'],
                template: `
<i v-if="player.metadata.avatar.type=='css-class'"
    :class="player.metadata.avatar.value"
    :style="{ 'color': player.metadata.color }"></i>
    
<div v-else-if="player.metadata.avatar.type=='piece'"
    class="avatar__piece-wrap"
    :class="{ 'avatar__piece-wrap--customizable': customize }"
    v-on="customize ? { 
        'click': $root.customization.domEvents.pieceClick,
        'mousedown': $root.customization.domEvents.pieceDrag,
        'mousemove': $root.customization.domEvents.pieceDrag,
        'wheel': $root.customization.domEvents.pieceWheel
    } : {}">
    
    <div class="avatar__piece-piece"
        :style="{ 
            'background-image': 'url(' + player.metadata.avatar.value.piece.url + ')' 
        }"></div>
        
    <div class="avatar__piece-piece-mask"
        :style="{ 
            'mask-image': 'url(' + player.metadata.avatar.value.piece.url + ')',
            '-webkit-mask-image': 'url(' + player.metadata.avatar.value.piece.url + ')',
            'background-color': player.metadata.color,
            'opacity': 0.5
        }"></div>
        
    <div class="avatar__piece-face"
        v-if="player.metadata.avatar.value.face"
        :style="{ 
            'background-image': 'url(' + player.metadata.avatar.value.face.url + ')',
            'top': player.metadata.avatar.value.face.top,
            'left': player.metadata.avatar.value.face.left,
            'width': player.metadata.avatar.value.face.width,
            'height': player.metadata.avatar.value.face.height
        }"></div>
        
    <div class="avatar__piece-accessory"
        v-if="player.metadata.avatar.value.accessory"
        :style="{ 
            'background-image': 'url(' + player.metadata.avatar.value.accessory.url + ')',
            'top': player.metadata.avatar.value.accessory.top,
            'left': player.metadata.avatar.value.accessory.left,
            'width': player.metadata.avatar.value.accessory.width,
            'height': player.metadata.avatar.value.accessory.height
        }"></div>
</div>

<i v-else class="fas fa-question"
    :style="{ 'color': player.metadata.color }"></i>`
            };

            // Borrowed from https://codepen.io/square0225/pen/QdvLQg
            components['fill-circle'] = {
                props: ['percent', 'color'],
                template: `
<svg viewBox="0 0 100 100" height="1em" style="height: 100%; transform: rotate(-90deg); border-radius: 50%; fill: none; stroke-width: 100%;"
    :style="{ 'stroke': color || '#7f8c8d', 'stroke-dasharray': ((Math.min(Math.max(percent,0),100) || 0) * Math.PI) + ', 999' }">
    <circle cx="50" cy="50" r="50"></circle>  
</svg>`
            };

            return components;
        },

        applyDefault(vueApp) {
            _.forEach(helpers.components.getDefault(), (component: any, key: string) => {
                vueApp.component(key, component);
            });
        }
    }

    return helpers;
})();