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
$.ajaxSetup({timeout:1000});
window.addEventListener("message", function (event) {if(event.data == "refresh"){refresh();}}, false);

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
var routereditor;
var pluginseditor;

function init_graph() {
    if (container === undefined) {
        container = document.getElementById('routers-graph')
        redraw();
    }
}

function select_router_node(pid) {
    if (network) {
        if (pid) {
            network.selectNodes([pid]);
        } else {
            network.selectNodes([]);
        }
    }
}

function parentLinkId(from, to, tree_nb) {
    return "" + tree_nb + "_" + from + "_" + to;
}

function brokenLinkId(node1, node2) {
    return "bk_" + (node1>node2?node1:node2) + "_" + (node1>node2?node2:node1);
}

function updateDataSet(set, elements) {
    set.update(elements);
    set.getIds().forEach(function(id) {
        if(elements.find(function(elem){return elem.id === id}) === undefined) {
            try{ set.remove(id); } catch(err) {}
        }
    });
}

function containsLinkBetween(edgeset, node1, node2) {
    return edgeset.find(function (edge) {
            return (edge.from === node1 && edge.to === node2) ||
                (edge.from === node2 && edge.to === node1);
        }) !== undefined ;
}

function updateNodes(zServices, plugins) {
    zNodes = Object.keys(zServices).map( function(id, idx) {
        title = "<b>Router</b></br>" + 
                zServices[id].pid + "</br>" + 
                zServices[id].locators;
        return {id: zServices[id].pid, shape: "image", image: { unselected: "router.svg", selected: "router-dark.svg" }, title: title};
    });
    updateDataSet(nodes, zNodes);
}

function getSessionForPeer(service, peerid) {
    peer = service.trees.peers.find(function(peer){return (peer.pid === peerid);});
    return service.sessions.find(function(session){return (session.sid === peer.sid);});
}

function updateEdges(zServices, plugins) {
    links = Object.keys(zServices).map( function(id, idx) {
        return zServices[id].sessions
            .map( function (session){ 
                return {
                    id: brokenLinkId(zServices[id].pid, session.peer),
                    from: zServices[id].pid, to: session.peer, 
                    label:"<b></b>", arrows:'', 
                    color:null, dashes:false, width:2};
            });
        }).flat();
    updateDataSet(edges, links);
}

function graphfailure   (){
    $("#message").html("Unable to contact server!");
    edges.forEach(edge => {
        edge.label = "<b></b>";
        edge.arrows = "";
        edge.color = null;
        if(edge.width > 2){edge.width = 2;};
        edges.update(edge);
    });
    nodes.forEach(node => {
        node.color = null;
        if(node.shape == 'image'){node.image = node.image.replace(/00DD00/g, "F5F5F5").replace(/000000/g, "BBBBBB")}
        nodes.update(node);
    });
    options.nodes.color = disabled_node_color;
    options.edges.color = disabled_edge_color;
    options.nodes.font.color = disabled_node_text_color;
    options.nodes.font.bold.color = disabled_node_text_color;
    network.setOptions(options);
}

function cleanfailure(){
    $("#message").html("");
    options.nodes.color = default_node_color;
    options.edges.color = default_edge_color;
    options.nodes.font.color = default_node_text_color;
    options.nodes.font.bold.color = default_node_text_color;
    network.setOptions(options);
}

function transform(values) {
    try {
        return values.reduce(function(dict, val){
            dict[val.key] = val.value;
            return dict;
        }, {});
    } catch(error){ return {}; }
}

function update(zServices, plugins) {
    cleanfailure();
    updateNodes(zServices, plugins);
    updateEdges(zServices, plugins);
}

function refresh() {
    $.getJSON($.url().param('url') + "/@/router/*", zServices => {
        $.getJSON($.url().param('url') + "/@/router/*/plugin/*", plugins => {
            update(transform(zServices), transform(plugins));
        }).fail(failure);
    }).fail(failure);
}

function autorefresh() {
    $("#autorefresh").toggleClass("loading");
    if($("#autorefresh").hasClass("loading"))
    {
        function periodicupdate(){
            $.getJSON("/@/router/*", zServices => {
                $.getJSON("/@/router/*/plugin/*", plugins => {
                    update(transform(zServices), transform(plugins));
                    if($("#autorefresh").hasClass("loading"))
                    {
                        setTimeout(periodicupdate, 500);
                    }
                })
                .fail(() => {
                    failure();
                    if($("#autorefresh").hasClass("loading"))
                    {
                        setTimeout(periodicupdate, 500);
                    }
                });
            })
            .fail(() => {
                failure();
                if($("#autorefresh").hasClass("loading"))
                {
                    setTimeout(periodicupdate, 500);
                }
            });
        }
        periodicupdate();
    }
}

function mapkeys(dict, fun) {
    return Object.keys(dict).reduce(
        (accu, current) => {accu[fun(current)] = dict[current]; return accu;}, 
        {});
}

function filterkeys(dict, fun) {
    return Object.keys(dict).reduce(
        (accu, current) => {if (fun(current) == true) { accu[current] = dict[current];} return accu;}, 
        {});
}

function showDetails(zServices, plugins) {
    if(network && network.getSelectedNodes()[0]) {
        changehash('GRAPH', network.getSelectedNodes()[0]);
    } else {
        changehash('GRAPH');
    }
}

function resetgraph(){
    network = new vis.Network(container, data, options);
    network.on("click", showDetails);
    network.on("dragStart", showDetails);
}

function redraw() {
    $.getJSON($.url().param('url') + "/@/router/*", zServices => {
        $.getJSON($.url().param('url') + "/@/router/*/plugin/*", plugins => {
            resetgraph();
            update(transform(zServices), transform(plugins));
            select_router_node($.url().attr('fragment').split(':')[1]);
        })
        .fail(() => {
            resetgraph();
            failure();
        });
    })
    .fail(() => {
        resetgraph();
        failure();
    });
}