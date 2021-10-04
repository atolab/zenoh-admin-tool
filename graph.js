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
var nodes = new vis.DataSet();
var edges = new vis.DataSet();
var container;
var data = {
    nodes: nodes,
    edges: edges
};
var default_node_color = {background:"#7BBCFF", border:"#00356D", 
                          highlight:{background:"#2397FF", border:"#00356D"}};
var default_node_text_color = "#000000";
var disabled_node_color = {background:"#F5F5F5", border:"#BBBBBB", 
                           highlight:{background:"#F5F5F5", border:"#BBBBBB"}};
var disabled_node_text_color = "#BBBBBB";
var default_edge_color = {color:"grey", highlight:"grey", hover:"grey"};
var disabled_edge_color = {color:"#EEEEEE", highlight:"#EEEEEE", hover:"#EEEEEE"};
var flow_edge_color = {color:"#1387FF", highlight:"#1387FF", hover:"#1387FF"};

var options = {
    edges:{font:{face:'sans-serif', size:10, multi:"html", bold:{face:'sans-serif', size:12}}, selectionWidth:0, smooth:{enabled:false}},
    nodes:{font:{face:'sans-serif', size:10, multi:"html", bold:{face:'sans-serif', size:12}}, color:default_node_color},
    physics:{enabled:true},
};
var network;

$(document).ready(function () {
    $('#graph-config-button').attr("onClick", 
        "$('#graph-stats-dropdown').removeClass('w3-show');$('#graph-config-dropdown').toggleClass('w3-show');" +
        "$('#graph-stats-button').removeClass('w3-theme-l3');$('#graph-config-button').toggleClass('w3-theme-l3');" +
        "return false;");
    $('#graph-stats-button').attr("onClick", 
        "$('#graph-config-dropdown').removeClass('w3-show');$('#graph-stats-dropdown').toggleClass('w3-show');" +
        "$('#graph-config-button').removeClass('w3-theme-l3');$('#graph-stats-button').toggleClass('w3-theme-l3');" +
        "return false;");

    $('#clients-switch').jqxSwitchButton({checked:false, height: 25});
    $('#clients-switch').bind("change", function(event){ update(); });
    $('#physics-switch').jqxSwitchButton({checked:true, height: 25});
    $('#physics-switch').bind("checked", function(event){ if (network) { network.setOptions({physics:{enabled:true}}) }});
    $('#physics-switch').bind("unchecked", function(event){ if (network) { network.setOptions({physics:{enabled:false}}) }});

    $('#stats-switch').jqxSwitchButton({checked:false, height: 25});
    $('#stats-switch').bind("change", function(event){ update(); });
    $("#edge_highlight").selectmenu({change: function( event, ui ) {update();}});
})

function initGraph() {
    if (container === undefined) {
        container = document.getElementById('routers-graph-canvas')
        redraw();
    }
}

function selectNode(pid) {
    if (network && data) {
        if (pid && nodes.get(pid)) {
            network.selectNodes([pid]);
        } else {
            network.selectNodes([]);
        }
    }
}

function linkId(node1, node2) {
    return (node1>node2?node1:node2) + "_" + (node1>node2?node2:node1);
}

function updateDataSet(set, elements) {
    set.update(elements);
    set.getIds().forEach(function(id) {
        if(elements.find(function(elem){return elem.id === id}) === undefined) {
            try{ set.remove(id); } catch(err) {}
        }
    });
}

function updateNodes(zServices) {
    zRouters = Object.keys(zServices).map( function(id, idx) {
        title = "<b>Router</b></br>" + 
                zServices[id].pid + "</br>" + 
                zServices[id].locators;
        return {id: zServices[id].pid, type: "router", shape: "image", image: { unselected: "router.svg", selected: "router-dark.svg" }, title: title};
    });
    zClients = $('#clients-switch').val() ?
        Object.keys(zServices).map( function(id, idx) {
            return zServices[id].sessions.filter(session => session.whatami === "client").map(function (session) {
                title = "<b>Client</b></br>" + session.peer + "</br>";
                return {id: session.peer, type: "client", parent: zServices[id].pid, shape: "image", image: { unselected: "client.svg", selected: "client-dark.svg" }, title: title};
            });
        }).flat()
    :[];
    updateDataSet(nodes, zRouters.concat(zClients));
}

function getHighlight(old_stats, new_stats, rate) {
    switch ($( "#edge_highlight" ).val()) {
        case "Total bytes/s": return [ (new_stats.tx_bytes - old_stats.tx_bytes) / rate, (new_stats.rx_bytes - old_stats.rx_bytes) / rate, " b/s" ];
        case "Total transport msgs/s": return [ (new_stats.tx_t_msgs - old_stats.tx_t_msgs) / rate, (new_stats.rx_t_msgs - old_stats.rx_t_msgs) / rate, " m/s" ];
        case "Total zenoh msgs/s": return [ (new_stats.tx_z_msgs - old_stats.tx_z_msgs) / rate, (new_stats.rx_z_msgs - old_stats.rx_z_msgs) / rate, " m/s" ];
        case "Total zenoh data/s": return [ (new_stats.tx_z_data_msgs - old_stats.tx_z_data_msgs) / rate, (new_stats.rx_z_data_msgs - old_stats.rx_z_data_msgs) / rate, " m/s" ];
        case "Total zenoh query/s": return [ (new_stats.tx_z_query_msgs - old_stats.tx_z_query_msgs) / rate, (new_stats.rx_z_query_msgs - old_stats.rx_z_query_msgs) / rate, " m/s" ];
        case "Total zenoh reply/s": return [ (new_stats.tx_z_data_reply_msgs - old_stats.tx_z_data_reply_msgs) / rate, (new_stats.rx_z_data_reply_msgs - old_stats.rx_z_data_reply_msgs) / rate, " m/s" ];
    }
}

function updateEdges(zServices) {
    period = 0;
    time = new Date().getTime();
    if (localStorage["updateEdges"]) {
        period = time - localStorage["updateEdges"];
    }
    localStorage["updateEdges"] = time;
    links = Object.keys(zServices).map( function(id, idx) {
        return zServices[id].sessions
            .filter(session => session.whatami != "router" || zServices[id].pid > session.peer)
            .map( function (session){ 
                if ($('#stats-switch').val()) {
                    if (session.stats) {
                        if (!($( "#edge_highlight" ).val() === "None") && localStorage[zServices[id].pid + "_" + session.peer] && period > 0) {
                            previous = JSON.parse(localStorage[zServices[id].pid + "_" + session.peer]);
                            const [tx_rate, rx_rate, unit] = getHighlight(previous, session.stats, period / 1000);
                            localStorage[zServices[id].pid + "_" + session.peer] = JSON.stringify(session.stats);

                            if (Math.floor(tx_rate) + Math.floor(rx_rate) > 0) {
                                arrows = '';
                                if (Math.floor(tx_rate) > 0) {arrows += 'to, '}
                                if (Math.floor(rx_rate) > 0) {arrows += 'from, '}
                                label= "<b>" + (Math.floor(tx_rate) + Math.floor(rx_rate)) + unit + "</b>";
                                return {
                                    id: linkId(zServices[id].pid, session.peer),
                                    from: zServices[id].pid, to: session.peer, 
                                    label:label, arrows:arrows, 
                                    color:flow_edge_color, dashes:false, width:4};
                            }
                            return {
                                id: linkId(zServices[id].pid, session.peer),
                                from: zServices[id].pid, to: session.peer, 
                                label:"<b>0 " + unit + "</b>", arrows:'', 
                                color:null, dashes:false, width:2};
                        }
                        else
                        {
                            localStorage[zServices[id].pid + "_" + session.peer] = JSON.stringify(session.stats);
                        }
                    }
                    return {
                        id: linkId(zServices[id].pid, session.peer),
                        from: zServices[id].pid, to: session.peer, 
                        label:"<b></b>", arrows:'', 
                        color:null, dashes:false, width:2};
                }
                return {
                    id: linkId(zServices[id].pid, session.peer),
                    from: zServices[id].pid, to: session.peer, 
                    label:"<b></b>", arrows:'', 
                    color:null, dashes:false, width:2};
            });
        }).flat();
    updateDataSet(edges, links);
}

function transform(values) {
    try {
        return values.reduce(function(dict, val){
            dict[val.key] = val.value;
            return dict;
        }, {});
    } catch(error){ return {}; }
}

function updateGraph(zServices) {
    updateNodes(zServices);
    updateEdges(zServices);
}

function showDetails() {
    if(network && network.getSelectedNodes()[0]) {
        if (network.body.data.nodes._data[network.getSelectedNodes()[0]].type === 'client') {
            changeHash('GRAPH', network.body.data.nodes._data[network.getSelectedNodes()[0]].parent, network.getSelectedNodes()[0]);
        } else {
            changeHash('GRAPH', network.getSelectedNodes()[0]);
        }
    } else {
        changeHash('GRAPH');
    }
}

function resetGraph(){
    network = new vis.Network(container, data, options);
    network.on("click", showDetails);
    network.on("dragStart", showDetails);
}

function redraw() {
    $.getJSON($.url().param('url') + "/@/router/*", zServices => {
        resetGraph();
        updateGraph(transform(zServices));
        selectNode($.url().attr('fragment').split(':')[1]);
    })
    .fail(() => {
        resetGraph();
        failure();
    });
}