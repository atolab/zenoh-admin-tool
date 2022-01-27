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
var charts = {};

function getServer() {
  let server = localStorage.getItem("Zenoh Administration Tool [server]");
  if (!server) {
    server = "http://localhost:8000";
  }
  return server;
}

function setServer(server) {
  if (server) {
    localStorage.setItem("Zenoh Administration Tool [server]", server);
  }
}

function getHistory() {
  let hist = [];
  let jsonHist = localStorage.getItem("Zenoh Administration Tool [history]");
  if (jsonHist) {
    hist = JSON.parse(jsonHist);
  }
  return hist;
}

function updateHistory(zServices) {
  let hist = getHistory();
  let now = new Date().getTime();
  hist.push([now, zServices]);
  let cleanHist = hist.filter(item => item[0] >= now - 10000);
  localStorage.setItem("Zenoh Administration Tool [history]", JSON.stringify(cleanHist));
}

function getLastServices() {
  return getHistory().sort((a, b) => b[0] - a[0])[0][1];
}

function getLastService(pid) {
  let lastServices = getLastServices();
  if (lastServices) {
    return lastServices.find(srv => srv.key === "/@/router/" + pid);
  } else {
    return undefined;
  }
}

function buildDataForRouter(pid1) {
  let data = {};
  let now = new Date().getTime();
  let hist = getHistory();
  for( let i = 0; i < hist.length - 1; i++){
    let time_data = {};
    let time1 = hist[i][0];
    let time2 = hist[i + 1][0];
    let zServices1 = transform(hist[i][1]);
    let zServices2 = transform(hist[i + 1][1]);
    if (zServices1["/@/router/" + pid1].sessions.length) {
      zServices1["/@/router/" + pid1].sessions.forEach(function(session1, idx) {
        let session2 = zServices2["/@/router/" + pid1].sessions.find(session => session.peer === session1.peer);
        if (session1.stats && session2 && session2.stats) {
          Object.keys(session1.stats).filter(key => key.startsWith("tx_")).forEach(function (txkey, idx) {
            let rxkey = txkey.replace("tx_", "rx_");
            if (session1.stats.hasOwnProperty(txkey) && session1.stats.hasOwnProperty(rxkey) && session2.stats.hasOwnProperty(txkey) && session2.stats.hasOwnProperty(rxkey)) {
              if (!time_data[txkey]) {time_data[txkey] = 0;}
              if (!time_data[rxkey]) {time_data[rxkey] = 0;}
              time_data[txkey] += (session1.stats[txkey] - session2.stats[txkey]);
              time_data[rxkey] += (session1.stats[rxkey] - session2.stats[rxkey]);
            }
  
          });
        }
      });
      Object.keys(time_data).forEach(function (key, idx) {
        if (!data[key]) {data[key] = [];}
        data[key].push([(time1 - now)/1000, time_data[key] / (time1 - time2) * 1000]);
      });
    } else {
      if (!data['tx_bytes']) {data['tx_bytes'] = [];}
      data['tx_bytes'].push([(time1 - now)/1000, 0]);
      if (!data['rx_bytes']) {data['rx_bytes'] = [];}
      data['rx_bytes'].push([(time1 - now)/1000, 0]);
      if (!data['tx_t_msgs']) {data['tx_t_msgs'] = [];}
      data['tx_t_msgs'].push([(time1 - now)/1000, 0]);
      if (!data['rx_t_msgs']) {data['rx_t_msgs'] = [];}
      data['rx_t_msgs'].push([(time1 - now)/1000, 0]);
      if (!data['tx_z_msgs']) {data['tx_z_msgs'] = [];}
      data['tx_z_msgs'].push([(time1 - now)/1000, 0]);
      if (!data['rx_z_msgs']) {data['rx_z_msgs'] = [];}
      data['rx_z_msgs'].push([(time1 - now)/1000, 0]);
    }
  }
  Object.keys(data).forEach(key => data[key].sort((a, b)=> b[0] - a[0]));
  return data;
}

function buildDataForSession(pid1, pid2) {
  let data = {};
  let now = new Date().getTime();
  let hist = getHistory();
  for( let i = 0; i < hist.length - 1; i++){
    let time1 = hist[i][0];
    let time2 = hist[i + 1][0];
    let zServices1 = transform(hist[i][1]);
    let zServices2 = transform(hist[i + 1][1]);
    if (zServices1["/@/router/" + pid1] && zServices2["/@/router/" + pid1]) {
      let session1 = zServices1["/@/router/" + pid1].sessions.find(session => session.peer === pid2);
      let session2 = zServices2["/@/router/" + pid1].sessions.find(session => session.peer === pid2);
      if (session1 && session1.stats && session2 && session2.stats) {
        Object.keys(session1.stats).filter(key => key.startsWith("tx_")).forEach(function (txkey, idx) {
          let rxkey = txkey.replace("tx_", "rx_");
          let ttkey = txkey.replace("tx_", "tt_");
          if (session1.stats.hasOwnProperty(txkey) && session1.stats.hasOwnProperty(rxkey) && session2.stats.hasOwnProperty(txkey) && session2.stats.hasOwnProperty(rxkey)) {
            if (!data[txkey]) {data[txkey] = [];}
            if (!data[rxkey]) {data[rxkey] = [];}
            // if (!data[ttkey]) {data[ttkey] = [];}
            data[txkey].push([(time1 - now)/1000, 
              (session1.stats[txkey] - session2.stats[txkey]) / (time1 - time2) * 1000]);
            data[rxkey].push([(time1 - now)/1000, 
              (session1.stats[rxkey] - session2.stats[rxkey]) / (time1 - time2) * 1000]);
            // data[ttkey].push([(time1 - now)/1000, 
            //   (session1.stats[txkey] + session1.stats[rxkey] - session2.stats[txkey] - session2.stats[rxkey]) / (time1 - time2) * 1000]);
          }
        });
      }
    }
  }
  Object.keys(data).forEach(key => data[key].sort((a, b)=> b[0] - a[0]));
  return data;
}

function initChart(id, title,  height) {
  charts[id] = toastui.Chart.lineChart({ 
    el: document.getElementById(id), 
    data: {series: [],}, 
    options: {
      chart: { title, width: 'auto', height, animation: false },
      yAxis: {scale: {min:0}},
      tooltip: {template: (model, defaultTooltipTemplate, theme) => {return ``;}},
      exportMenu: {visible: false},
      responsive: {animation: false},
      theme: {legend: {label: {fontSize: 13}}},
    },
  });
}

function updateChart(chart, data, series) {
  let useries = series
    .filter(serie => data[serie.name])
    .map(serie => {
      let s_data = chart.store.state.legend.data.find(data => data.label === serie.name);
      serie.checked = s_data?s_data.checked:undefined;
      return serie;
    });
  chart.setData({series: useries.map(serie => {return {name: serie.name, data: data[serie.name]}})});
  useries.forEach(serie => {
    let s_data = chart.store.state.legend.data.find(data => data.label === serie.name);
    if (s_data) {
      s_data.viewLabel = Math.floor(data[serie.name][0][1]) + ' ' + serie.name + '/s';
      if (!(serie.checked === undefined)) {
        s_data.checked = serie.checked;
      } else if (!serie.default) {
        chart.eventBus.emit('clickLegendCheckbox', [{label: serie.name, checked: true}]);
      }
    }
  });
}

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

function selectProcess(type, pid, subpid) {
  $("#routers-list").children().removeClass("w3-theme-d1");
  switch (type) {
    case 'router': 
      $("#" + pid).addClass("w3-theme-d1");
      selectNode(pid);
      break;
    case 'client':             
      if ($('#clients-switch').val()) {
        selectNode(subpid);
      } else {
        selectNode();
      }
      break;
    case 'edge': 
      selectEdge(pid, subpid);
      break;
  }
  updateSidePanel(type, pid, subpid);
}

function updateSidePanel(type, pid, subpid) {
  if (type && pid) {
    switch (type) {
      case 'router':
        $("#side-panel-title").html("Router " + pid);
        $("#side-panel-empty").css("display", "none");
        $("#side-panel-router").css("display", "flex");
        $("#side-panel-edge").css("display", "none");
        let lastService = undefined;
        switch ($("#side-panel-router").tabs('option', 'active')) {
          case 0: 
            lastService = getLastService(pid);
            if (lastService) {routereditor.update(lastService.value);}
            break;
          case 1: updateStoragesPanel(pid);break;
          case 2: 
            lastService = getLastService(pid);
            if (lastService) {updateClientsPanel(lastService.value);}
            break;
          case 3: 
          lastService = getLastService(pid);
          if (lastService) {updateSessionsPanel(lastService.value);}
          break;
            break;
          case 4: updateRouterStatsPanel(pid);break;
        }
        break;
      case 'client':
        $("#side-panel-title").html("Client " + subpid);
        $("#side-panel-empty").css("display", "block");
        $("#side-panel-router").css("display", "none");
        $("#side-panel-edge").css("display", "none");
        break;
      case 'edge':
        $("#side-panel-title").html(Mustache.render($('#side-panel-edge-header-template').html(), { pid, subpid }));
        let node = getNode(subpid);
        if (!(node && node.type === "router")) {
          $("#mirror_session").addClass("w3-hide");
        }
        $("#side-panel-empty").css("display", "none");
        $("#side-panel-router").css("display", "none");
        $("#side-panel-edge").css("display", "flex");

        let data = buildDataForSession(pid, subpid);
        if (!Object.keys(data).length) {
          $("#edge-no-stats").removeClass("w3-hide");
        } else {
          $("#edge-no-stats").addClass("w3-hide");
        }
        updateChart(charts['edge-bytes-chart'], data, [
          {name: 'tx_bytes', default:true},
          {name: 'rx_bytes', default:true},
          {name: 'tx_z_data_payload_bytes', default:false},
          {name: 'rx_z_data_payload_bytes', default:false},
          {name: 'tx_z_data_reply_payload_bytes', default:false},
          {name: 'rx_z_data_reply_payload_bytes', default:false},
        ]);
        updateChart(charts['edge-t-msgs-chart'], data, [
          {name: 'tx_t_msgs', default:true},
          {name: 'rx_t_msgs', default:true},
        ]);
        updateChart(charts['edge-z-msgs-chart'], data, [
          {name: 'tx_z_msgs', default:true},
          {name: 'rx_z_msgs', default:true},
          {name: 'tx_z_data_msgs', default:true},
          {name: 'rx_z_data_msgs', default:true},
          {name: 'tx_z_query_msgs', default:false},
          {name: 'rx_z_query_msgs', default:false},
          {name: 'tx_z_data_reply_msgs', default:false},
          {name: 'rx_z_data_reply_msgs', default:false},
        ]);
        break;
    }
  } else {
    $("#side-panel-title").html("");
    $("#side-panel-empty").css("display", "block");
    $("#side-panel-router").css("display", "none");
    $("#side-panel-edge").css("display", "none");
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
      url: $.url().param('url') + "/@/router/" + pid + "/status/plugins/storages/backends/" + $('#load_backend_name').val(),
      type: 'PUT',
      headers: { "content-type": "application/properties" },
      data: $('#load_backend_props').val().replace(/(?:\r\n|\r|\n)/g, ';').replace(/\s/g, ""),
      success: function (rep) {
        setTimeout(function () { updateStoragesPanel(pid); }, 200);
      },
    }).fail(function () { failure(); });
    event.preventDefault();
  });
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/status/plugins/storages/backends/*", zBackends => {
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
  $.getJSON($.url().param('url') + "/@/router/" + pid + "/status/plugins/storages/backends/" + backend + "/storages/*", zStorages => {
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
      $("#backend_" + backend + "_storage_" + sto_name + "_key_expr").html(sto.value.key_expr);
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

function updateClientsPanel(zRouter) {
  zRouter.sessions.sort(function(a, b) {return a.peer.localeCompare(b.peer);});
  let clients = zRouter.sessions.filter(session => session.whatami === "client");
  if (clients.length) {
    $("#clients-list").html(
      clients.map(session => Mustache.render(
        $('#clients_list_item').html(),
        { pid: zRouter.pid, subpid: session.peer }
      ))
    );
  } else {
    $("#clients-list").html("<li class='w3-center'>no clients</li>");
  }
}

function updateSessionsPanel(zRouter) {
  zRouter.sessions.sort(function(a, b) {return a.peer.localeCompare(b.peer);});
  if (zRouter.sessions.length) {
    $("#sessions-list").html(
      zRouter.sessions.map(session => Mustache.render(
        $('#sessions_list_item').html(),
        { pid: zRouter.pid, subpid: session.peer, whatami: session.whatami }
      ))
    );
  } else {
    $("#sessions-list").html("<li class='w3-center'>no sessions</li>");
  }
}

function updateRouterStatsPanel(pid) {
  let router_data = buildDataForRouter(pid);
  if (!Object.keys(router_data).length) {
    $("#router-no-stats").removeClass("w3-hide");
  } else {
    $("#router-no-stats").addClass("w3-hide");
  }
  updateChart(charts['router-bytes-chart'], router_data, [
    {name: 'tx_bytes', default:true},
    {name: 'rx_bytes', default:true},
    {name: 'tx_z_data_payload_bytes', default:false},
    {name: 'rx_z_data_payload_bytes', default:false},
    {name: 'tx_z_data_reply_payload_bytes', default:false},
    {name: 'rx_z_data_reply_payload_bytes', default:false},
  ]);
  updateChart(charts['router-t-msgs-chart'], router_data, [
    {name: 'tx_t_msgs', default:true},
    {name: 'rx_t_msgs', default:true},
  ]);
  updateChart(charts['router-z-msgs-chart'], router_data, [
    {name: 'tx_z_msgs', default:true},
    {name: 'rx_z_msgs', default:true},
    {name: 'tx_z_data_msgs', default:true},
    {name: 'rx_z_data_msgs', default:true},
    {name: 'tx_z_query_msgs', default:false},
    {name: 'rx_z_query_msgs', default:false},
    {name: 'tx_z_data_reply_msgs', default:false},
    {name: 'rx_z_data_reply_msgs', default:false},
  ]);
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
    url: $.url().param('url') + "/@/router/" + pid + "/status/plugins/storages/backends/" + backend + "/storages/" + name,
    type: 'PUT',
    headers: { "content-type": "application/properties" },
    data: properties,
    success: function (rep) {
      setTimeout(function () { updateBackendPanel(pid, backend); }, 200);
    },
  }).fail(function () { failure(); });
}

function changeHash(view, type, pid, subpid) {
  if (type) {
    if (pid) {
      if (subpid) {
        location.href='#' + view + ':' + type + ':' + pid + ':' + subpid;
      } else {
        location.href='#' + view + ':' + type + ':' + pid;
      }
    } else {
      location.href='#' + view + ':' + type;
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
  let query = $('#stats-switch').val()?"?(stats=true)":"";
  $.getJSON($.url().param('url') + "/@/router/*" + query, zServices => {
    try {
      updateHistory(zServices);
      cleanFailure();
      updateList(zServices);
      updateGraph(transform(zServices));
      let pid = $.url().attr('fragment').split(':')[2];
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
  $('#stats-switch').jqxSwitchButton({checked:true, height: 30});
  $('#autorefresh-period').spinner({min: 100, step: 10});
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

  initChart('router-bytes-chart', 'total bytes/s', 300);
  initChart('router-t-msgs-chart', 'transport msgs/s', 200);
  initChart('router-z-msgs-chart', 'zenoh msgs/s', 250);

  initChart('edge-bytes-chart', 'total bytes/s', 300);
  initChart('edge-t-msgs-chart', 'transport msgs/s', 200);
  initChart('edge-z-msgs-chart', 'zenoh msgs/s', 250);

  if (typeof $.url().param('url') === 'undefined') {
    $("#connect-form-url").val(getServer());
    $("#connect-dialog").dialog('open');
    $("#main").addClass("w3-opacity-max");
    $("#main").css("pointer-events", "none");
    window.onhashchange();
  } else {
    setServer($.url().param('url'));
    $("#router-address").html($.url().param('url'));
    $("#router-address").removeClass('w3-hide');
    $("#refresh").removeClass('w3-hide');

    $("#side-panel-router").tabs({
      activate: function( event, ui ) {window.onhashchange();}
    });

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
  selectProcess(split[1], split[2], split[3]);
}
