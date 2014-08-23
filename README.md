JSMQ
====

JSMQ is javascript client for ZeroMQ/NetMQ over WebSockets.

ZeroMQ and NetMQ don't have a WebSockets transport at the moment, however extensions already exist for [NetMQ](https://github.com/somdoron/NetMQ.WebSockets) and [CZMQ](https://github.com/ZeroMQ/zwssock).

For browsers without WebSockets support ([RFC6455](http://tools.ietf.org/html/rfc6455)) you can try to use [web-socket-js](https://github.com/gimite/web-socket-js).

Both JSMQ and NetMQ WebSockets are beta at the moment and the API and protocol will probably changed.

The JSMQ currently implement the dealer and subscriber patterns and the NetMQ WebSockets implement the router and publisher patterns.

You can download the JSMQ.JS file from this page or from [nuget](https://www.nuget.org/packages/JSMQ/), just search for JSMQ and include prerelease.

Using JSMQ is very similar to using other high level binding of ZeroMQ. Following is small example:

```html
<html>
    <script src="C:\Git\JSMQ\JSMQ.js"></script>
    <script>
        var dealer = new JSMQ.Dealer();
        dealer.connect("ws://localhost");

        // we must wait for the dealer to be connected before we can send messages, any messages we are trying to send
        // while the dealer is not connected will be dropped
        dealer.sendReady = function() {
            document.getElementById("sendButton").disabled = "";
        };

        var subscriber = new JSMQ.Subscriber();
        subscriber.connect("ws://localhost:81");
        subscriber.subscribe("chat");

        subscriber.onMessage = function (message) {
            
            // we ignore the first frame because it's topic
            message.popString();

            document.getElementById("chatTextArea").value =
                document.getElementById("chatTextArea").value +
                message.popString()  + "\n";
        };

        dealer.onMessage = function (message) {
            // the response from the server
            alert(message.popString());
        };

        function send() {
            var message = new JSMQ.Message();
            message.addString(document.getElementById("messageTextBox").value);
            
            dealer.send(message);
        }
    </script>
    <body>                        
        <textarea id="chatTextArea" readonly="readonly"></textarea>
        <br/>
        <label>Message:</label><input id="messageTextBox" value="" />
        <button id="sendButton" disabled="disabled" onclick="javascript:send();">
            Send
        </button>                    
    </body>
</html>
```



