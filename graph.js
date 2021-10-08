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
var network_data = {
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
    edges:{font:{face:'sans-serif', size:10, multi:"html", bold:{face:'sans-serif', size:12}}, selectionWidth:4, smooth:{enabled:false}},
    nodes:{font:{face:'sans-serif', size:10, multi:"html", bold:{face:'sans-serif', size:12}}, color:default_node_color},
    interaction:{selectConnectedEdges: false},
    physics:{enabled:true},
};
var network;

$(document).ready(function () {
    $('#graph-config-button').attr("onClick", 
        "$('#graph-config-dropdown').toggleClass('w3-show');$('#graph-config-button').toggleClass('w3-theme-l3');return false;");

    $('#clients-switch').jqxSwitchButton({checked:false, height: 25});
    $('#clients-switch').bind("change", function(event){ update(); });
    $('#physics-switch').jqxSwitchButton({checked:true, height: 25});
    $('#physics-switch').bind("checked", function(event){ if (network) { network.setOptions({physics:{enabled:true}}) }});
    $('#physics-switch').bind("unchecked", function(event){ if (network) { network.setOptions({physics:{enabled:false}}) }});
    $("#edge_highlight").selectmenu({change: function( event, ui ) {update();}});
})

function initGraph() {
    if (container === undefined) {
        container = document.getElementById('routers-graph-canvas')
        redraw();
    }
}

function getNode(pid) {
    return nodes.get(pid)
}

function selectNode(pid) {
    if (network && network_data) {
        if (pid && nodes.get(pid)) {
            network.selectNodes([pid], false);
        } else {
            network.selectNodes([], false);
        }
    }
}

function selectEdge(pid1, pid2) {
    if (network) {
        network.selectNodes([], false);
        try{ network.selectEdges([linkId(pid1, pid2)]); } catch(err) {}
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

function getHighlight(edge_data) {
    switch ($( "#edge_highlight" ).val()) {
        case "Total bytes/s": if (edge_data.tx_bytes && edge_data.rx_bytes) { return [edge_data.tx_bytes[0][1], edge_data.rx_bytes[0][1], " b/s"]; } else { return undefined; }
        case "Total data payload bytes/s": if (edge_data.tx_z_data_payload_bytes && edge_data.rx_z_data_payload_bytes) { return [edge_data.tx_z_data_payload_bytes[0][1], edge_data.rx_z_data_payload_bytes[0][1], " b/s"]; } else { return undefined; }
        case "Total reply payload bytes/s": if (edge_data.tx_z_data_reply_payload_bytes && edge_data.rx_z_data_reply_payload_bytes) { return [edge_data.tx_z_data_reply_payload_bytes[0][1], edge_data.rx_z_data_reply_payload_bytes[0][1], " b/s"]; } else { return undefined; }
        case "Total transport msgs/s": if (edge_data.tx_t_msgs && edge_data.rx_t_msgs) { return [edge_data.tx_t_msgs[0][1], edge_data.rx_t_msgs[0][1], " m/s"]; } else { return undefined; }
        case "Total zenoh msgs/s": if (edge_data.tx_z_msgs && edge_data.rx_z_msgs) { return [edge_data.tx_z_msgs[0][1], edge_data.rx_z_msgs[0][1], " m/s"]; } else { return undefined; }
        case "Total zenoh data/s": if (edge_data.tx_z_data_msgs && edge_data.rx_z_data_msgs) { return [edge_data.tx_z_data_msgs[0][1], edge_data.rx_z_data_msgs[0][1], " m/s"]; } else { return undefined; }
        case "Total zenoh query/s": if (edge_data.tx_z_query_msgs && edge_data.rx_z_query_msgs) { return [edge_data.tx_z_query_msgs[0][1], edge_data.rx_z_query_msgs[0][1], " m/s"]; } else { return undefined; }
        case "Total zenoh reply/s": if (edge_data.tx_z_data_reply_msgs && edge_data.rx_z_data_reply_msgs) { return [edge_data.tx_z_data_reply_msgs[0][1], edge_data.rx_z_data_reply_msgs[0][1], " m/s"]; } else { return undefined; }
    }
}

function updateEdges(zServices) {
    links = Object.keys(zServices).map( function(id, idx) {
        return zServices[id].sessions
            .filter(session => session.whatami != "router" || zServices[id].pid > session.peer)
            .map( function (session){ 
                if (!($( "#edge_highlight" ).val() === "None")) {
                    let edge_data = buildDataForSession(zServices[id].pid, session.peer);
                    if (edge_data) {
                        let highlight = getHighlight(edge_data);
                        if (highlight) {
                            const [tx_rate, rx_rate, unit] = highlight;
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
                    }
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
            changeHash('GRAPH', 'client', network.body.data.nodes._data[network.getSelectedNodes()[0]].parent, network.getSelectedNodes()[0]);
        } else {
            changeHash('GRAPH', 'router', network.getSelectedNodes()[0]);
        }
    } else if(network && network.getSelectedEdges()[0]) {
        let node = getNode(network.getSelectedEdges()[0].split('_')[0]);
        if (node && node.type === "router") {
            changeHash('GRAPH', 'edge', network.getSelectedEdges()[0].split('_')[0], network.getSelectedEdges()[0].split('_')[1]);
        } else {
            changeHash('GRAPH', 'edge', network.getSelectedEdges()[0].split('_')[1], network.getSelectedEdges()[0].split('_')[0]);
        }
    } else {
        changeHash('GRAPH');
    }
}

function resetGraph(){
    network = new vis.Network(container, network_data, options);
    network.on("click", showDetails);
    network.on("dragStart", showDetails);
}

function redraw() {
    let query = $('#stats-switch').val()?"?(stats=true)":"";
    $.getJSON($.url().param('url') + "/@/router/*" + query, zServices => {
        updateHistory(zServices);
        resetGraph();
        updateGraph(transform(zServices));
        if ($.url().attr('fragment').split(':')[1] === 'edge') {
            selectEdge($.url().attr('fragment').split(':')[2], $.url().attr('fragment').split(':')[3]);
        } else if ($.url().attr('fragment').split(':')[1] === 'client') {
            if ($('#clients-switch').val()) {
                selectNode($.url().attr('fragment').split(':')[3]);
            } else {
                selectNode();
            }
        } else {
            selectNode($.url().attr('fragment').split(':')[2]);
        }
    })
    .fail(() => {
        resetGraph();
        failure();
    });
}