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
    edges:{font:{face:'courier', size:10, multi:"html", bold:{face:'courier bold', size:12}}, selectionWidth:0},
    nodes:{shape:"box", margin:4, //heightConstraint:50, widthConstraint:92,  
           font:{face:'courier', size:10, multi:"html", align:'left', bold:{face:'courier bold', size:12}},
           color:default_node_color},
    physics:{enabled:true}
};
var network;

function initGraph() {
    if (container === undefined) {
        container = document.getElementById('routers-graph')
        redraw();
    }
}

function selectRouterNode(pid) {
    if (network) {
        if (pid) {
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
    zNodes = Object.keys(zServices).map( function(id, idx) {
        title = "<b>Router</b></br>" + 
                zServices[id].pid + "</br>" + 
                zServices[id].locators;
        return {id: zServices[id].pid, shape: "image", image: { unselected: "router.svg", selected: "router-dark.svg" }, title: title};
    });
    updateDataSet(nodes, zNodes);
}

function updateEdges(zServices) {
    links = Object.keys(zServices).map( function(id, idx) {
        return zServices[id].sessions
            .map( function (session){ 
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
        changeHash('GRAPH', network.getSelectedNodes()[0]);
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
        selectRouterNode($.url().attr('fragment').split(':')[1]);
    })
    .fail(() => {
        resetGraph();
        failure();
    });
}