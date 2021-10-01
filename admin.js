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

function cleanFailure() {
  $("#connection_status").removeClass("w3-orange");
  $("#connection_status").addClass("w3-theme-l3");
  $("#status_bar").addClass("w3-hide");
  $("#main").removeClass("w3-opacity-max");
  $("#main").css("pointer-events", "auto");
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

function selectProcess(pid, subpid) {
  $("#routers-list").children().removeClass("w3-theme-d1");
  if (subpid) {
    selectNode(subpid);
  } else {
    $("#" + pid).addClass("w3-theme-d1");
    selectNode(pid);
  }
  updateSidePanel(pid, subpid);
}

function updateSidePanel(pid, subpid) {
  if (pid) {
    if (subpid) {
      $("#side-panel-title").html("Client " + subpid);
      $("#side-panel-tabs").css("display", "none");
      $("#side-panel-tabs-empty").css("display", "block");
    } else {
      $("#side-panel-title").html("Router " + pid);
      $("#side-panel-tabs").css("display", "block");
      $("#side-panel-tabs-empty").css("display", "none");
      updateStoragesPanel(pid);
      $.getJSON($.url().param('url') + "/@/router/" + pid, zRouter => {
        if (zRouter[0].value) {
          routereditor.update(zRouter[0].value);
        }
      }).fail(function () { failure(); });
    }
  } else {
    $("#side-panel-title").html("");
    $("#side-panel-tabs").css("display", "none");
    $("#side-panel-tabs-empty").css("display", "block");
  }
}

function updateStoragesPanel(pid) {
  if (!$("#backend_list").length) {
    $("#side-panel-storages-tab").append(
      Mustache.render($('#backend_list_template').html(), { pid: pid })
    );
  }
  $("#load_backend").off("submit");
  $("#load_backend").on("submit", function (event) {
    $.ajax({
      url: $.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/" + $('#load_backend_name').val(),
      type: 'PUT',
      headers: { "content-type": "application/properties" },
      data: $('#load_backend_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""),
      success: function (rep) {
        setTimeout(function () { updateStoragesPanel(pid); }, 200);
      },
    }).fail(function () { failure(); });
    event.preventDefault();
  });
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/*", zBackends => {
    $("#backend_list").children().filter(function(){
      return !zBackends.some(be => "backend_" + be.key.split('/').reverse()[0] == $(this).attr('id'));
    }).remove();
    zBackends.forEach(be => {
      backend = be.key.split('/').reverse()[0];
      if (!$("#backend_" + backend).length) {
        $("#backend_list").append(Mustache.render($('#backend_list_item_template').html(), { backend: backend }));
        $("#backend_" + backend).accordion({
          active: "false",
          collapsible: "true",
          heightStyle: "content"
        });
      }
    });
    zBackends.forEach(be => {
      updateBackendPanel(pid, be.key.split('/').reverse()[0]);
    });
  }).fail(function () { failure(); });
}

function updateBackendPanel(pid, backend) {
  $("#create_" + backend + "_storage").off("submit");
  $("#create_" + backend + "_storage").on("submit", function (event) {
    event.preventDefault();
    createStorage(pid, backend, $('#create_' + backend + '_storage_name').val(),
      ' path_expr=' + $('#create_' + backend + '_storage_path').val() + ';'
      + $('#create_' + backend + '_storage_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""));
  });
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/plugin/storages/backend/" + backend + "/storage/*", zStorages => {
    $("#backend_" + backend + "_storage_list").children().filter(function(){
      return !zStorages.some(sto => "backend_" + backend + "_storage_" + sto.key.split('/').reverse()[0] == $(this).attr('id'));
    }).remove();
    zStorages.forEach( sto => {
      sto_name = sto.key.split('/').reverse()[0];
      if (!$("#backend_" + backend + "_storage_" + sto_name).length) {
        $("#backend_" + backend + "_storage_list").append(
          Mustache.render($('#storages_list_item_template').html(), {
            name: sto.key.split('/').reverse()[0],
            backend: backend,
          })
        );
        $("#backend_" + backend + "_storage_" + sto_name).accordion({
          active: "false",
          collapsible: "true",
          heightStyle: "content",
          icons: false,
        });
      }
      $("#backend_" + backend + "_storage_" + sto_name + "_path_expr").html(sto.value.path_expr);
      $("#backend_" + backend + "_storage_" + sto_name + "_properties").html(JSON.stringify(sto.value)
        .replaceAll("{", "")
        .replaceAll("}", "")
        .replaceAll("\":\"", " = ")
        .replaceAll(",", "<br>")
        .replaceAll("\"", ""));
      $("#backend_" + backend + "_storage_" + sto_name + "_delete").attr("onclick", "deleteStorage('" + sto.key + "')");
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

function changeHash(view, pid, subpid) {
  if (pid) {
    if (subpid) {
      location.href='#' + view + ':' + pid + ':' + subpid;
    } else {
      location.href='#' + view + ':' + pid;
    }
  } else {
    location.href='#' + view + ':';
  }
}

function updateList(zServices) {
  zServices.sort(function(a, b) {return a.value.pid.localeCompare(b.value.pid);});
  $("#routers-list").html(
    zServices.map(srv => Mustache.render(
      $('#routers_list_item').html(),
      { pid: srv.value.pid, locators: srv.value.locators }
    ))
  );
}

function update(schedule) {
  $.getJSON($.url().param('url') + "/@/router/*", zServices => {
    try {
      cleanFailure();
      updateList(zServices);
      updateGraph(transform(zServices));
      let pid = $.url().attr('fragment').split(':')[1];
      if (pid && !zServices.some(srv => srv.value.pid == pid)) {
        changeHash($.url().attr('fragment').split(':')[0]);
      } else {
        window.onhashchange();
      }
    } catch (error) {
      console.error(error);
    }
  }).fail(function () { 
    failure(); 
  });
}

function getPeriod() {
  period = parseInt($('#autorefresh-period').val());
  if (isNaN(period)) { period = 500; }
  if (period < 100) { period = 100; }
  return period;
}

function periodicUpdate() {
  update();
  if ($('#autorefresh-switch').val()) {
    setTimeout(periodicUpdate, getPeriod());
  }
}

$(document).ready(function () {
  $("#connect-dialog").dialog({ autoOpen: false });
  $('#autorefresh-switch').jqxSwitchButton({checked:true, height: 30});
  $('#autorefresh-switch').bind("checked", function(event){ if (typeof $.url().param('url') !== 'undefined') { periodicUpdate(); } });
  $('#main').jqxSplitter({ width: '100%', height: '100%', panels: [{ size: '60%', min: '20%', collapsible: false }, { size: '40%', min: '0%'}]});
  $('#main').on('expanded', function (event) {
    event.owner.splitBarButton.css("display", "none");
    event.owner.splitBar.css("width", "5px");
    event.owner.splitBar.css("margin-left", "0px");
  });
  $('#main').on('collapsed', function (event) {
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
    $("#main").addClass("w3-opacity-max");
    $("#main").css("pointer-events", "none");
    window.onhashchange();
  } else {
    $("#router-address").html($.url().param('url'));
    $("#router-address").removeClass('w3-hide');
    $("#refresh").removeClass('w3-hide');

    $("#side-panel-tabs").tabs();

    routereditor = new JSONEditor($('#side-panel-info-tab')[0], { mode: 'view' });

    periodicUpdate();
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
  selectProcess(split[1], split[2]);
}

