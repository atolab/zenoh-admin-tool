/*
 * Copyright (c) 2017, 2020 ADLINK Technology Inc.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the Apache License, Version 2.0
 * which is available at https://www.apache.org/licenses/LICENSE-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0 OR Apache-2.0
 *
 * Contributors:
 *   ADLINK zenoh team, <zenoh@adlink-labs.tech>
 */

var routereditor;

function failure() {
  $("#connection_status").removeClass("w3-theme-l3");
  $("#connection_status").addClass("w3-orange");
  $("#status_bar").removeClass("w3-hide");
  $("#main").addClass("w3-opacity-max");
  $("#main").css("pointer-events", "none");
}

function showGraphPanel() {
  $("#routers-list").css("display", "none");
  $("#routers-list-btn").removeClass("w3-theme-d1");
  $("#routers-graph").css("display", "block");
  $("#routers-graph-btn").addClass("w3-theme-d1");
}

function showListPanel() {
  $("#routers-graph").css("display", "none");
  $("#routers-graph-btn").removeClass("w3-theme-d1");
  $("#routers-list").css("display", "block");
  $("#routers-list-btn").addClass("w3-theme-d1");
}

function selectRouter(pid) {
  $("#routers-list").children().removeClass("w3-theme-d1");
  $("#" + pid).addClass("w3-theme-d1");
  updateRouterPanel(pid);
  selectRouterNode(pid);
}

function updateRouterPanel(pid) {
  if (pid) {
    $("#router-panel-title").html("Router " + pid);
    $("#router-panel-tabs").css("display", "block");
    $("#router-panel-tabs-empty").css("display", "none");
    updateStoragesPanel(pid);
    $.getJSON($.url().param('url') + "/@/router/" + pid, zRouter => {
      if (zRouter[0].value) {
        routereditor.update(zRouter[0].value);
      }
    }).fail(function () { failure(); });
  } else {
    $("#router-panel-title").html("");
    $("#router-panel-tabs").css("display", "none");
    $("#router-panel-tabs-empty").css("display", "block");
  }
}

function updateStoragesPanel(pid) {
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/*", zBackends => {
    $("#router-panel-storages-panel").html(
      zBackends.map(be => {
        return Mustache.render($('#backend_list_item').html(), { be_name: be.key.split('/').reverse()[0] })
      }).join('')
    );
    $("#router-panel-storages-panel").append(
      Mustache.render($('#load_backend_item').html(), { pid: pid })
    );
    $("#load_backend").submit(function (event) {
      $.ajax({
        url: $.url().param('url') + "/@/router/" + $('#load_backend_pid').val() + "/plugin/storages/backend/" + $('#load_backend_name').val(),
        type: 'PUT',
        headers: { "content-type": "application/properties" },
        data: $('#load_backend_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""),
        success: function (rep) {
          setTimeout(function () { updateStoragesPanel(pid); }, 200);
        },
      }).fail(function () { failure(); });
      event.preventDefault();
    });
    zBackends.forEach(be => {
      updateBackendPanel(pid, be.key.split('/').reverse()[0]);
    });

    $(".backend").accordion({
      active: "false",
      collapsible: "true",
      heightStyle: "content"
    });
  }).fail(function () { failure(); });
}

function updateBackendPanel(pid, backend) {
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/" + backend + "/storage/*", zStorages => {
    $("#backend_" + backend + "_content").html(
      zStorages.map(sto => {
        console.log(JSON.stringify(sto.value, null, " "));
        return Mustache.render($('#storages_list_item').html(), {
          name: sto.key.split('/').reverse()[0],
          path_expr: sto.value.path_expr,
          key: sto.key,
          properties: JSON.stringify(sto.value)
            .replaceAll("{", "")
            .replaceAll("}", "")
            .replaceAll("\":\"", " = ")
            .replaceAll(",", "<br>")
            .replaceAll("\"", ""),
        })
      }).join('')
    );
    $("#backend_" + backend + "_content").append(
      Mustache.render($('#add_storage_item').html(), { pid: pid, backend: backend })
    );
    $("#create_" + backend + "_storage").submit(function (event) {
      createStorage(pid, backend, $('#' + pid + '_' + backend + '_name').val(),
        ' path_expr=' + $('#' + pid + '_' + backend + '_path').val() + ';'
        + $('#' + pid + '_' + backend + '_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""));
      event.preventDefault();
    });
    $(".storage").accordion({
      active: "false",
      collapsible: "true",
      heightStyle: "content",
      icons: false,
    });
    $(".storage button").click(function (e) { e.stopPropagation() });
  }).fail(function () { failure(); });
}

function deleteStorage(sto) {
  $.ajax({
    url: $.url().param('url') + sto,
    type: 'DELETE',
    success: function (rep) {
      setTimeout(function () { updateBackendPanel(sto.split('/')[3], sto.split('/')[7]); }, 200);
    },
  }).fail(function () { failure(); });
}

function createStorage(pid, backend, name, properties) {
  $.ajax({
    url: $.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/" + backend + "/storage/" + name,
    type: 'PUT',
    headers: { "content-type": "application/properties" },
    data: properties,
    success: function (rep) {
      setTimeout(function () { updateBackendPanel(pid, backend); }, 200);
    },
  }).fail(function () { failure(); });
}

function changeHash(view, pid) {
  if (pid) {
    location.href='#' + view + ':' + pid;
  } else {
    location.href='#' + view + ':';
  }
}

$(document).ready(function () {
  $("#connect-dialog").dialog({ autoOpen: false });
  $('#main').jqxSplitter({ width: '100%', height: '100%', panels: [{ size: '60%', min: '20%', collapsible: false }, { size: '40%', min: '0%'}]});
  $('#main').on('expanded', function (event) {
    console.log(event);
    event.owner.splitBarButton.css("display", "none");
    event.owner.splitBar.css("width", "5px");
    event.owner.splitBar.css("margin-left", "0px");
  });
  $('#main').on('collapsed', function (event) {
    console.log(event);
    event.owner.splitBar.css("width", "");
    event.owner.splitBar.css("margin-left", "-25px");
    event.owner.splitBarButton.removeClass();
    event.owner.splitBarButton.addClass("w3-bar-item");
    event.owner.splitBarButton.addClass("w3-button");
    event.owner.splitBarButton.addClass("w3-large");
    event.owner.splitBarButton.addClass("w3-theme-d1");
    event.owner.splitBarButton.css("display", "block");
    event.owner.splitBarButton.css("width", "");
    event.owner.splitBarButton.css("height", "100%");
    event.owner.splitBarButton.css("top", "0");
    event.owner.splitBarButton.html("<i class='fas fa-angle-left w3-display-middle'>");
  });
  if (typeof $.url().param('url') === 'undefined') {
    $("#connect-dialog").dialog('open');
    window.onhashchange();
  } else {
    $("#router-address").html($.url().param('url'));
    $("#router-address").removeClass('w3-hide');

    $("#router-panel-tabs").tabs();
    $("#router-panel-storages-panel > div").accordion({
      active: "false",
      collapsible: "true",
      heightStyle: "content"
    });

    routereditor = new JSONEditor($('#router-panel-info-tab')[0], { mode: 'view' });

    console.log("GET " + $.url().param('url') + "/@/router/*");
    $.getJSON($.url().param('url') + "/@/router/*", zServices => {
      $("#routers-list").html(
        zServices.map(srv => Mustache.render(
          $('#routers_list_item').html(),
          { pid: srv.value.pid, locators: srv.value.locators }
        ))
      );
      window.onhashchange();
    }).fail(function () { console.log("failure");failure(); });
  }
})

window.onhashchange = function () {
  split = $.url().attr('fragment').split(':');
  if (split[0] == "GRAPH") {
    showGraphPanel();
    initGraph();
  } else {
    showListPanel();
  }
  selectRouter(split[1]);
}

