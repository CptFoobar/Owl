/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

module.metadata = {
  'stability': 'experimental',
  'engines': {
    'Firefox': '> 28'
  }
};

const { Class } = require('sdk/core/heritage');
const { merge } = require('sdk/util/object');
const { Disposable } = require('sdk/core/disposable');
const { on, off, emit, setListeners } = require('sdk/event/core');
const { EventTarget } = require('sdk/event/target');
const { getNodeView } = require('sdk/view/core');

const view = require('./view');
const { toggleButtonContract, toggleStateContract } = require('sdk/ui/button/contract');
const { properties, render, state, register, unregister,
  setStateFor, getStateFor, getDerivedStateFor } = require('sdk/ui/state');
const { events: stateEvents } = require('sdk/ui/state/events');
const { events: viewEvents } = require('sdk/ui/button/view/events');
const events = require('sdk/event/utils');

const { getActiveTab } = require('sdk/tabs/utils');

const { id: addonID } = require('sdk/self');
const { identify } = require('sdk/ui/id');

const buttons = new Map();

const toWidgetId = id =>
  ('toggle-button--' + addonID.toLowerCase()+ '-' + id).
    replace(/[^a-z0-9_-]/g, '');

const ToggleButton = Class({
  extends: EventTarget,
  implements: [
    properties(toggleStateContract),
    state(toggleStateContract),
    Disposable
  ],
  setup: function setup(options) {
    let state = merge({
      disabled: false,
      checked: false
    }, toggleButtonContract(options));

    let id = toWidgetId(options.id);

    register(this, state);

    // Setup listeners.
    setListeners(this, options);

    buttons.set(id, this);

    view.create(merge({ type: 'menu-button' }, state, { id: id }));
  },

  dispose: function dispose() {
    let id = toWidgetId(this.id);
    buttons.delete(id);

    off(this);

    view.dispose(id);

    unregister(this);
  },

  get id() this.state().id,

  click: function click() view.click(toWidgetId(this.id))
});
exports.MenuButton = ToggleButton;

identify.define(ToggleButton, ({id}) => toWidgetId(id));

getNodeView.define(ToggleButton, button =>
  view.nodeFor(toWidgetId(button.id))
);

let toggleButtonStateEvents = events.filter(stateEvents,
  e => e.target instanceof ToggleButton);

let toggleButtonViewEvents = events.filter(viewEvents,
  e => buttons.has(e.target));

let clickEvents = events.filter(toggleButtonViewEvents, e => e.type === 'click');
let updateEvents = events.filter(toggleButtonViewEvents, e => e.type === 'update');

on(toggleButtonStateEvents, 'data', ({target, window, state}) => {
  let id = toWidgetId(target.id);

  view.setIcon(id, window, state.icon);
  view.setLabel(id, window, state.label);
  view.setDisabled(id, window, state.disabled);
  view.setChecked(id, window, state.checked);
});

on(clickEvents, 'data', ({target: id, window, checked, menu }) => {
  let button = buttons.get(id);
  let windowState = getStateFor(button, window);

  let newWindowState = merge({}, windowState, { checked: checked });

  setStateFor(button, window, newWindowState);

  let state = getDerivedStateFor(button, getActiveTab(window));

  emit(button, 'click', state, menu);

  // emit(button, 'change', state);
});

on(updateEvents, 'data', ({target: id, window}) => {
  render(buttons.get(id), window);
});
