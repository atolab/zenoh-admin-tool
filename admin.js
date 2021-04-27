
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

function open_router_panel() {
  if ($("#router-panel").css("width") == "0px") {
    $("#router-panel").css("transition", "0.3s");
    if ($(window).width() > 1280) {
      $("#router-panel").css("width", ($(window).width() - 640) + "px");
    } else if ($(window).width() > 640) {
      $("#router-panel").css("width", "640px");
    } else {
      $("#router-panel").css("width", "100%");
    }
  }
}

function close_router_panel() {
  $("#router-panel").css("transition", "0.3s");
  $("#router-panel").css("width", "0px");
  $("#routers-list").children().removeClass("w3-theme-d1");
}

function update_router_panel(pid) {
  $("#routers-list").children().removeClass("w3-theme-d1");
  $("#" + pid).addClass("w3-theme-d1");
  $("#router-panel-title-pid").html(pid);
  update_storages_panel(pid);
  $.getJSON("http://localhost:8000/@/router/" + pid, zRouter => {
    routereditor.update(zRouter[0].value);
  });
}

function update_storages_panel(pid) {
  $.getJSON("http://localhost:8000/@/router/" + pid + "/plugin/storages/backend/*", zBackends => {
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
        url: "http://localhost:8000/@/router/" + $('#load_backend_pid').val() + "/plugin/storages/backend/" + $('#load_backend_name').val(),
        type: 'PUT',
        headers: { "content-type": "application/properties" },
        data: $('#load_backend_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""),
        success: function (rep) {
          setTimeout(function () { update_storages_panel(pid); }, 200);
        },
      });
      event.preventDefault();
    });
    zBackends.forEach(be => {
      update_backend_panel(pid, be.key.split('/').reverse()[0]);
    });

    $(".backend").accordion({
      active: "false",
      collapsible: "true",
      heightStyle: "content"
    });
  });
}

function update_backend_panel(pid, backend) {
  $.getJSON("http://localhost:8000/@/router/" + pid + "/plugin/storages/backend/" + backend + "/storage/*", zStorages => {
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
      create_storage(pid, backend, $('#' + pid + '_' + backend + '_name').val(),
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
  });
}

function delete_storage(sto) {
  $.ajax({
    url: "http://localhost:8000" + sto,
    type: 'DELETE',
    success: function (rep) {
      setTimeout(function () { update_backend_panel(sto.split('/')[3], sto.split('/')[7]); }, 200);
    },
  });
}

function create_storage(pid, backend, name, properties) {
  $.ajax({
    url: "http://localhost:8000/@/router/" + pid + "/plugin/storages/backend/" + backend + "/storage/" + name,
    type: 'PUT',
    headers: { "content-type": "application/properties" },
    data: properties,
    success: function (rep) {
      setTimeout(function () { update_backend_panel(pid, backend); }, 200);
    },
  });
}

$(document).ready(function () {
  $("#connect-dialog").dialog({ autoOpen: false });
  if (typeof $.url().param('url') === 'undefined') {
    $("#connect-dialog").dialog('open');
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

    $.getJSON($.url().param('url') + "/@/router/*", zServices => {
      $("#routers-list").html(
        zServices.map(srv => Mustache.render(
          $('#routers_list_item').html(),
          { pid: srv.value.pid, locators: srv.value.locators }
        ))
      );
    })

    window.onhashchange();
  }
})

window.onhashchange = function () {
  if ($.url().attr('fragment') !== '') {
    open_router_panel();
    update_router_panel($.url().attr('fragment'));
  } else {
    close_router_panel();
  }
}

