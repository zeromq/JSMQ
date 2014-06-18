// Endpoint class

function Endpoint(address) {
    var ClosedState = 0;
    var ConnectingState = 1;
    var ActiveState = 2;
    
    var reconnectTries = 0;
    
    console.log("connecting to " + address);
    var webSocket = null;
    var state = ClosedState;

    var inPipe = [];        
    
    var that = this;

    open();
    
    function open() {
        if (webSocket != null) {
            webSocket.onopen = null;
            webSocket.onclose = null;
            webSocket.onmessage = null;
        }

        webSocket = new window.WebSocket(address, ["WSNetMQ"]);
        state = ConnectingState;

        webSocket.onopen = onopen;
        webSocket.onclose = onclose;
        webSocket.onmessage = onmessage;
    }
    
    function onopen (e) {
        console.log("WebSocket opened to " + address);
        reconnectTries = 0;

        state = ActiveState;

        if (that.activated != null) {
            that.activated(that);        
        }               
    };

    function onclose(e) {
        console.log("WebSocket closed " + address);
        var stateBefore = state;
        state = ClosedState;

        if (stateBefore == ActiveState && that.deactivated != null) {
            that.deactivated(that);
        }
        
        if (reconnectTries > 10) {
            window.setTimeout(open, 2000);
        } else {
            open();
        }
    };

    function onmessage(message) {
        inPipe.push(message.data);
        
        if (that.readActivated != null && inPipe.length == 1) {
            that.readActivated(that);
        }
    };
    
    // activated event, when the socket is open
    this.activated = null;
    
    // deactivated event
    this.deactivated = null;

    // messages are ready to be read
    this.readActivated = null;
    
    this.getHasOut = function() {
        return state == ActiveState;
    };

    this.getHasIn = function() {
        return inPipe.length > 0;
    };

    this.write = function(message) {
        webSocket.send(message);
    };

    this.read = function() {
        if (inPipe.length == 0)
            return null;

        return inPipe.shift();
    };
}

// LoadBalancer

function LB() {
    var endpoints = [];
    
    var current = 0;

    var isActive = false;

    this.writeActivated = null;

    var that = this;

    this.attach = function(endpoint) {
        endpoints.push(endpoint);        

        if (!isActive) {
            isActive = true;

            if (that.writeActivated != null)
                that.writeActivated();
        }        
    };

    this.terminated = function(endpoint) {
        var index = endpoints.indexOf(endpoint);
        
        if (current == index) {
            current = 0;
        }

        endpoints.splice(index, 1);
    };

    this.send = function(message) {
        if (endpoints.length == 0) {
            isActive = false;
            return false;
        }

        endpoints[current].write(message);
        current = (current + 1) % endpoints.length;

        return true;
    };

    this.getHasOut = function() {
        return endpoints.length > 1;
    };
}

// FairQueueing

function FQ() {
    var that = this;
    var endpoints = [];

    var current = 0;
    var activeIndex = 0;
    var isActive = false;

    
    function swap(index1, index2) {
        var temp = endpoints[index1];
        endpoints[index1] = endpoints[index2];
        endpoints[index2] = temp;
    }

    this.readActivated = null;

    this.attach = function (endpoint) {
        endpoints.push(endpoint);
        endpoint.readActivated = function(e) {
            swap(endpoints.indexOf(endpoint), activeIndex);
            activeIndex++;
            
            if (!isActive) {
                isActive = true;

                if (that.readActivated != null) {
                    that.readActivated();                
                }
            }
        };
        swap(activeIndex, endpoints.length - 1);
    };

    this.terminated = function (endpoint) {
        var index = endpoints.indexOf(endpoint);

        if (index < activeIndex) {
            activeIndex--;
            swap(index, activeIndex);
            
            if (current == activeIndex) {
                current = 0;
            }
        }
        endpoints.splice(index, 1);
        endpoint.readActivated = null;
    };  

    this.receive = function() {
        var message;

        while (activeIndex > 0) {
            message = endpoints[current].read();
            
            if (message != null) {
                current = (current + 1) % activeIndex;

                return message;
            }

            activeIndex--;
            swap(current, activeIndex);

            if (current == activeIndex)
                current = 0;
        }

        isActive = false;

        return null;
    };
    
    this.getHasIn = function () {
        while (activeIndex > 0) {
            if (endpoints[current].getHasIn())
                return true;

            activeIndex--;
            swap(endpoints, current, activeIndex);
            
            if (current == activeIndex)
                current = 0;
        }

        isActive = false;

        return false;
    };
}

// SocketBase Class

function SocketBase(xattachEndpoint, xendpointTerminated, xhasIn, xhasOut, xsend, xreceive) {

    this.receiveReady = null;
    this.sendReady = null;

    var endpoints = [];

    function onEndpointActivated(endpoint) {
        xattachEndpoint(endpoint);
    }

    function onEndpointDeactivated(endpoint) {        
        xendpointTerminated(endpoint);               
    }

    this.connect = function (address) {        
        var endpoint = new Endpoint(address);
        endpoint.activated = onEndpointActivated;
        endpoint.deactivated = onEndpointDeactivated;
        endpoints.push(endpoint);
    };

    this.disconnect = function(address) {
        // TODO: implement disconnect
    };
    
    this.send = function(message) {
        return xsend(message);
    };

    this.receive = function() {
        return xreceive();
    };

    this.getHasIn = function() {
        return xhasIn();
    };

    this.getHasOut = function() {
        return xhasOut();
    };
}


function Dealer() {

    var fq = new FQ();
    var lb = new LB();
    
    var that = new SocketBase(xattachEndpoint, xendpointTerminated, xhasIn, xhasOut, xsend, xreceive);

    fq.readActivated = function() {
        if (that.receiveReady != null) {
            that.receiveReady(that);
        }
    };

    lb.writeActivated = function() {
        if (that.sendReady != null) {
            that.sendReady(that);
        }
    };

    function xattachEndpoint(endpoint) {
        fq.attach(endpoint);
        lb.attach(endpoint);
    }

    function xendpointTerminated(endpoint) {
        fq.terminated(endpoint);
        lb.terminated(endpoint);
    }

    function xhasIn() {
        return fq.getHasIn();
    }

    function xhasOut() {
        return lb.getHasOut();
    }

    function xsend(message) {
        return lb.send(message);
    }

    function xreceive() {
        return fq.receive();
    }

    return that;
}
